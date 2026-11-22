// Invoice service with in-memory storage
import { generateInvoiceMemo } from '../utils/memo';
import { CreateInvoiceInput } from '../utils/validation';
import { assertCanExtendExpiry } from '../utils/invoice-expiry';
import memoryStorage from '../storage/memory-storage';

class InvoiceMemoryService {
  /**
   * Create a new invoice
   */
  async createInvoice(input: CreateInvoiceInput): Promise<any> {
    // The seller public key now comes from the caller (the frontend).
    if (!input.sellerPublicKey) {
      throw new Error('Seller public key is required');
    }

    const memo = generateInvoiceMemo();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays || 7));

    const invoice = memoryStorage.createInvoice({
      sellerPublicKey: input.sellerPublicKey, // Dynamic wallet of the caller.
      amount: input.amount,
      assetCode: input.assetCode || 'XLM',
      assetIssuer: input.assetIssuer,
      memo,
      description: input.description,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      expiresAt,
    });

    console.log('✅ Invoice created:', invoice.id);
    return invoice;
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(id: string): Promise<any | null> {
    return memoryStorage.getInvoiceById(id);
  }

  /**
   * Get invoice by memo
   */
  async getInvoiceByMemo(memo: string): Promise<any | null> {
    return memoryStorage.getInvoiceByMemo(memo);
  }

  /**
   * Get the invoice that already stored this transaction hash, if any
   */
  async getInvoiceByTxHash(txHash: string): Promise<any | null> {
    return memoryStorage.getInvoiceByTxHash(txHash) ?? null;
  }

  /**
   * Update invoice status to PAID
   */
  async markAsPaid(
    invoiceId: string,
    txHash: string,
    payerPublicKey: string,
    paymentLedger?: number,
  ): Promise<any> {
    const invoice = memoryStorage.markAsPaid(invoiceId, txHash, payerPublicKey, paymentLedger);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    console.log('✅ Invoice marked as paid:', invoiceId);
    return invoice;
  }

  /**
   * Append a lifecycle event to an invoice's audit trail.
   */
  async recordStatusEvent(
    invoiceId: string,
    status: StatusEventStatus,
    txHash?: string,
  ): Promise<StatusEvent[]> {
    const event = memoryStorage.appendStatusEvent(invoiceId, status, txHash);
    if (!event) {
      throw new Error('Invoice not found');
    }
    return this.getStatusHistory(invoiceId);
  }

  /**
   * Status history for the owning seller, oldest first. The rows contain only
   * status / time / optional transaction hash — never customer contact data.
   */
  async getStatusHistory(invoiceId: string): Promise<StatusEvent[]> {
    const invoice = memoryStorage.getInvoiceById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    return memoryStorage.getStatusHistory(invoiceId);
  }

  /** Extend the settlement window and record the EXTENDED transition. */
  async extendInvoice(invoiceId: string, days: number): Promise<any> {
    const invoice = memoryStorage.getInvoiceById(invoiceId);
    if (!invoice || invoice.status !== 'PENDING') {
      throw new Error('Invoice not found or not pending');
    }
    const expiresAt = new Date(invoice.expiresAt);
    expiresAt.setDate(expiresAt.getDate() + days);
    memoryStorage.appendStatusEvent(invoiceId, 'EXTENDED');
    return memoryStorage.updateInvoice(invoiceId, { expiresAt });
  }

  /** Record a partial payment without moving the invoice to PAID. */
  async recordPartialPayment(invoiceId: string, txHash?: string): Promise<any> {
    const invoice = memoryStorage.getInvoiceById(invoiceId);
    if (!invoice || invoice.status !== 'PENDING') {
      throw new Error('Invoice not found or not pending');
    }
    memoryStorage.appendStatusEvent(invoiceId, 'PARTIALLY_PAID', txHash);
    return invoice;
  }

  /** Record a refund of a previously paid invoice. */
  async recordRefund(invoiceId: string, txHash?: string): Promise<any> {
    const invoice = memoryStorage.getInvoiceById(invoiceId);
    if (!invoice || invoice.status !== 'PAID') {
      throw new Error('Invoice not found or not paid');
    }
    memoryStorage.appendStatusEvent(invoiceId, 'REFUNDED', txHash);
    return invoice;
  }

  /**
   * Record the single on-chain anchor for a paid invoice.
   *
   * The canonical digest is recomputed from the stored invoice and compared
   * before anything is written — the backend never signs and never accepts a
   * digest that would not satisfy the contract.
   */
  async anchorProof(invoiceId: string, digest: string, txHash: string): Promise<any> {
    const invoice = memoryStorage.getInvoiceById(invoiceId);
    if (!invoice) {
      throw new AnchorError(AnchorErrorCode.INVOICE_NOT_FOUND, 'Invoice not found');
    }
    if (invoice.status !== 'PAID') {
      throw new AnchorError(AnchorErrorCode.INVOICE_NOT_PAID, 'Only a paid invoice can be anchored');
    }
    if (invoice.anchoringTxHash) {
      throw new AnchorError(AnchorErrorCode.ALREADY_ANCHORED, 'Invoice is already anchored');
    }
    if (!canonicalDigestMatches(invoice, digest)) {
      throw new AnchorError(AnchorErrorCode.DIGEST_MISMATCH, 'Digest does not match the invoice');
    }
    if (!/^[0-9a-fA-F]{64}$/.test(txHash)) {
      throw new AnchorError(AnchorErrorCode.INVALID_TX_HASH, 'Invalid anchoring transaction hash');
    }

    return memoryStorage.updateInvoice(invoiceId, { anchoringTxHash: txHash });
  }

  /**
   * Get all invoices for a seller
   */
  async getInvoicesBySeller(
    sellerPublicKey: string,
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    let invoices = memoryStorage.getAllInvoices(status ? { status } : undefined);

    if (sellerPublicKey) {
      invoices = invoices.filter((inv) => inv.sellerPublicKey === sellerPublicKey);
    }

    return invoices.slice(offset, offset + limit);
  }

  /**
   * Cancel an invoice
   */
  async cancelInvoice(invoiceId: string): Promise<any> {
    const invoice = memoryStorage.getInvoiceById(invoiceId);

    if (!invoice || invoice.status !== 'PENDING') {
      throw new Error('Invoice not found or already processed');
    }

    return memoryStorage.updateInvoice(invoiceId, { status: 'CANCELLED' });
  }

  /**
   * Push expiresAt later exactly once for the owning seller.
   * Memo, amount, and asset are left untouched.
   */
  async extendExpiry(
    invoiceId: string,
    sellerPublicKey: string,
    newExpiresAt: Date | string,
  ): Promise<any> {
    const invoice = memoryStorage.getInvoiceById(invoiceId);

    if (!invoice) {
      throw Object.assign(new Error('Invoice not found'), { code: 'NOT_FOUND', status: 404 });
    }

    const decision = assertCanExtendExpiry(invoice, sellerPublicKey, newExpiresAt);
    if (!decision.ok) {
      throw Object.assign(new Error(decision.error), {
        code: decision.code,
        status: 400,
      });
    }

    const updates: Record<string, unknown> = {
      expiresAt: decision.newExpiresAt,
      originalExpiresAt: decision.originalExpiresAt,
      expiryExtended: true,
    };

    // Extending an expired unpaid invoice revives it; voided stays rejected above.
    if (decision.reviveToPending) {
      updates.status = 'PENDING';
    }

    const updated = memoryStorage.updateInvoice(invoiceId, updates);
    console.log('✅ Invoice expiry extended:', invoiceId);
    return updated;
  }

  /**
   * Mark expired invoices
   */
  async markExpiredInvoices(): Promise<number> {
    return memoryStorage.markExpiredInvoices();
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(sellerPublicKey: string): Promise<any> {
    return [memoryStorage.getStats(sellerPublicKey)];
  }
}

export default new InvoiceMemoryService();

