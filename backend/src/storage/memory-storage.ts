// In-memory storage - Database yerine MVP için
import { v4 as uuidv4 } from 'uuid';

export interface Invoice {
  id: string;
  sellerPublicKey: string;
  sellerMuxedAddress?: string;
  amount: number;
  lineItems?: Array<{ label: string; quantity: number; unitPrice: number }>;
  assetCode: string;
  assetIssuer?: string;
  memo: string;
  description?: string;
  lineItems?: unknown[];
  customerName?: string;
  customerEmail?: string;
  status: InvoiceStatus;
  paymentTxHash?: string;
  paymentLedger?: number;
  payerPublicKey?: string;
  ledger?: number;
  createdAt: Date;
  paidAt?: Date;
  expiresAt: Date;
  /** Expiry at creation (or before the one allowed extension). */
  originalExpiresAt: Date;
  /** True after the seller has used the one allowed extension. */
  expiryExtended: boolean;
  /** Hash of the transaction that anchored the proof digest on chain. */
  anchoringTxHash?: string;
}

/** Current invoice status -> the history event a transition produces. */
function statusEventFor(status: InvoiceStatus): StatusEventStatus {
  switch (status) {
    case 'CANCELLED':
      return 'VOIDED';
    case 'PAID':
      return 'PAID';
    case 'EXPIRED':
      return 'EXPIRED';
    default:
      return 'CREATED';
  }
}

class MemoryStorage {
  private invoices: Map<string, Invoice> = new Map();
  private invoicesByMemo: Map<string, string> = new Map(); // memo -> invoice id
  private invoicesByTxHash: Map<string, string> = new Map(); // tx hash -> invoice id
  private statusHistory: Map<string, StatusEvent[]> = new Map();

  // Create invoice
  createInvoice(data: Partial<Invoice>): Invoice {
    const expiresAt = data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invoice: Invoice = {
      id: data.id || uuidv4(),
      sellerPublicKey: data.sellerPublicKey!,
      sellerMuxedAddress: data.sellerMuxedAddress,
      amount: data.amount!,
      lineItems: data.lineItems,
      assetCode: data.assetCode || 'XLM',
      assetIssuer: data.assetIssuer,
      memo: data.memo!,
      description: data.description,
      lineItems: data.lineItems ? [...data.lineItems] : undefined,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      status: 'PENDING',
      createdAt: new Date(),
      expiresAt,
      originalExpiresAt: data.originalExpiresAt || expiresAt,
      expiryExtended: data.expiryExtended ?? false,
    };

    this.invoices.set(invoice.id, invoice);
    this.invoicesByMemo.set(invoice.memo, invoice.id);
    this.appendStatusEvent(invoice.id, 'CREATED');

    console.log('✅ Invoice created in memory:', invoice.id);
    return invoice;
  }

  // Called only after the complete backup has been validated. Keep both
  // lookup indexes in sync with the restored rows.
  importInvoices(invoices: Invoice[]): void {
    for (const invoice of invoices) {
      this.invoices.set(invoice.id, invoice);
      this.invoicesByMemo.set(invoice.memo, invoice.id);
      if (invoice.paymentTxHash) {
        this.invoicesByTxHash.set(invoice.paymentTxHash, invoice.id);
      }
    }
  }

  // Get invoice by ID
  getInvoiceById(id: string): Invoice | undefined {
    return this.invoices.get(id);
  }

  // Get invoice by memo
  getInvoiceByMemo(memo: string): Invoice | undefined {
    const id = this.invoicesByMemo.get(memo);
    return id ? this.invoices.get(id) : undefined;
  }

  // Get the invoice that already stored this transaction hash, if any
  getInvoiceByTxHash(txHash: string): Invoice | undefined {
    const id = this.invoicesByTxHash.get(txHash);
    return id ? this.invoices.get(id) : undefined;
  }

  /**
   * Append a lifecycle event. Identical transitions issued in the same
   * request (same status, same transaction hash, effectively the same
   * instant) collapse into one row instead of producing duplicates.
   */
  appendStatusEvent(
    invoiceId: string,
    status: StatusEventStatus,
    txHash?: string,
    at: Date = new Date(),
  ): StatusEvent | undefined {
    if (!this.invoices.has(invoiceId)) return undefined;

    const events = this.statusHistory.get(invoiceId) ?? [];
    const last = events[events.length - 1];
    if (
      last &&
      last.status === status &&
      (last.txHash ?? undefined) === (txHash ?? undefined) &&
      Math.abs(at.getTime() - last.at.getTime()) < 100
    ) {
      return last;
    }

    const event: StatusEvent = {
      status,
      at,
      ...(txHash ? { txHash } : {}),
    };
    events.push(event);
    this.statusHistory.set(invoiceId, events);
    return event;
  }

  /** All events for an invoice, oldest first. Never includes customer PII. */
  getStatusHistory(invoiceId: string): StatusEvent[] {
    const events = this.statusHistory.get(invoiceId) ?? [];
    return events
      .map((event) => ({ ...event, at: new Date(event.at) }))
      .sort((a, b) => a.at.getTime() - b.at.getTime());
  }

  // Update invoice
  updateInvoice(id: string, updates: Partial<Invoice>): Invoice | undefined {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;

    const updated = { ...invoice, ...updates };
    this.invoices.set(id, updated);

    if (updates.status && updates.status !== invoice.status) {
      this.appendStatusEvent(id, statusEventFor(updates.status), updates.paymentTxHash);
    }

    console.log('✅ Invoice updated:', id);
    return updated;
  }

  // Mark as paid
  markAsPaid(
    id: string,
    txHash: string,
    payerPublicKey: string,
    meta?: { ledger?: number; paidAt?: Date }
  ): Invoice | undefined {
    const existing = this.invoices.get(id);
    if (!existing) {
      return undefined;
    }

    // Once an invoice is paid, later matching payments must not replace the
    // first transaction hash, payer, ledger, or paid timestamp.
    if (existing.status === 'PAID') {
      return existing;
    }

    if (meta?.ledger === undefined || meta?.ledger === null || !Number.isFinite(meta.ledger)) {
      throw new Error('Ledger sequence is required to mark invoice as paid');
    }

    const paidAtDate = meta?.paidAt ?? new Date();
    const invoice = this.updateInvoice(id, {
      status: 'PAID',
      paymentTxHash: txHash,
      payerPublicKey,
      paidAt: paidAtDate,
      ledger: meta.ledger,
    });

    // Remember the hash so it cannot settle a second invoice later.
    if (invoice) {
      this.invoicesByTxHash.set(txHash, id);
    }

    return invoice;
  }

  markUncollectible(id: string): Invoice | undefined {
    return this.updateInvoice(id, { status: 'UNCOLLECTIBLE' });
  }

  // Get all invoices
  getAllInvoices(filter?: { status?: string }): Invoice[] {
    let invoices = Array.from(this.invoices.values());

    if (filter?.status) {
      invoices = invoices.filter(inv => inv.status === filter.status);
    }

    return invoices.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Get stats
  getStats(sellerPublicKey: string): any {
    const invoices = Array.from(this.invoices.values()).filter(
      inv => inv.sellerPublicKey === sellerPublicKey
    );

    return {
      total_invoices: invoices.length,
      paid_invoices: invoices.filter(inv => inv.status === 'PAID').length,
      pending_invoices: invoices.filter(inv => inv.status === 'PENDING').length,
      expired_invoices: invoices.filter(inv => inv.status === 'EXPIRED').length,
      uncollectible_invoices: invoices.filter(inv => inv.status === 'UNCOLLECTIBLE').length,
      total_revenue: invoices
        .filter(inv => inv.status === 'PAID')
        .reduce((sum, inv) => sum + inv.amount, 0),
      asset_code: 'XLM',
    };
  }

  // Mark expired invoices
  markExpiredInvoices(): number {
    const now = new Date();
    let count = 0;

    this.invoices.forEach((invoice) => {
      if (invoice.status === 'PENDING' && invoice.expiresAt < now) {
        invoice.status = 'EXPIRED';
        this.appendStatusEvent(invoice.id, 'EXPIRED');
        count++;
      }
    });

    if (count > 0) {
      console.log(`⏰ Marked ${count} invoices as expired`);
    }

    return count;
  }

  // Clear all data (for testing)
  clear() {
    this.invoices.clear();
    this.invoicesByMemo.clear();
    this.invoicesByTxHash.clear();
    this.statusHistory.clear();
    console.log('🗑️ Memory storage cleared');
  }

  // Get size
  size(): number {
    return this.invoices.size;
  }
}

export default new MemoryStorage();

