// In-memory storage - Database yerine MVP için
import { v4 as uuidv4 } from 'uuid';

interface Invoice {
  id: string;
  sellerPublicKey: string;
  sellerName?: string;
  amount: number;
  assetCode: string;
  assetIssuer?: string;
  memo: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  paymentTxHash?: string;
  payerPublicKey?: string;
  ledger?: number;
  createdAt: Date;
  paidAt?: Date;
  expiresAt: Date;
  /** Expiry at creation (or before the one allowed extension). */
  originalExpiresAt: Date;
  /** True after the seller has used the one allowed extension. */
  expiryExtended: boolean;
}

class MemoryStorage {
  private invoices: Map<string, Invoice> = new Map();
  private invoicesByMemo: Map<string, string> = new Map(); // memo -> invoice id
  private invoicesByTxHash: Map<string, string> = new Map(); // tx hash -> invoice id

  // Create invoice
  createInvoice(data: Partial<Invoice>): Invoice {
    const expiresAt = data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invoice: Invoice = {
      id: data.id || uuidv4(),
      sellerPublicKey: data.sellerPublicKey!,
      sellerName: data.sellerName,
      amount: data.amount!,
      assetCode: data.assetCode || 'XLM',
      assetIssuer: data.assetIssuer,
      memo: data.memo!,
      description: data.description,
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

    console.log('✅ Invoice created in memory:', invoice.id);
    return invoice;
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

  // Update invoice
  updateInvoice(id: string, updates: Partial<Invoice>): Invoice | undefined {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;

    const updated = { ...invoice, ...updates };
    this.invoices.set(id, updated);

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
    console.log('🗑️ Memory storage cleared');
  }

  // Get size
  size(): number {
    return this.invoices.size;
  }
}

export default new MemoryStorage();

