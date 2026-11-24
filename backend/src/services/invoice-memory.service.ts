// Invoice service with in-memory storage
import { generateInvoiceMemo, validateMemoByteLength } from '../utils/memo';
import { CreateInvoiceInput } from '../utils/validation';
import { assertCanExtendExpiry } from '../utils/invoice-expiry';
import { getStorage } from '../storage/storage-factory';
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '../utils/parse-pagination';

class InvoiceMemoryService {
  /**
   * Create a new invoice
   */
  async createInvoice(input: CreateInvoiceInput): Promise<any> {
    // The seller public key now comes from the caller (the frontend).
    if (!input.sellerPublicKey) {
      throw new Error('Seller public key is required');
    }

    let memo = generateInvoiceMemo();

    if (input.memo) {
      const memoValidation = validateMemoByteLength(input.memo);
      if (!memoValidation.valid) {
        throw new Error(memoValidation.error);
      }
      memo = input.memo;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays || 7));

    const storage = await getStorage();
    const invoice = await storage.createInvoice({
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
    const storage = await getStorage();
    return storage.getInvoiceById(id);
  }

  /**
   * Get invoice by memo
   */
  async getInvoiceByMemo(memo: string): Promise<any | null> {
    const storage = await getStorage();
    return storage.getInvoiceByMemo(memo);
  }

  /**
   * Get the invoice that already stored this transaction hash, if any
   */
  async getInvoiceByTxHash(txHash: string): Promise<any | null> {
    const storage = await getStorage();
    return (await storage.getInvoiceByTxHash(txHash)) ?? null;
  }

  /**
   * Update invoice status to PAID
   */
  async markAsPaid(invoiceId: string, txHash: string, payerPublicKey: string, ledgerSeq?: number, paidAt?: Date): Promise<any> {
    const storage = await getStorage();
    if (!(await storage.getInvoiceById(invoiceId))) {
      throw new Error('Invoice not found');
    }

    if (ledgerSeq === undefined || ledgerSeq === null || !Number.isFinite(ledgerSeq)) {
      throw new Error('Ledger sequence is required to mark invoice as paid');
    }

    const invoice = await storage.markAsPaid(invoiceId, txHash, payerPublicKey, { ledger: ledgerSeq, paidAt: paidAt });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    console.log('✅ Invoice marked as paid:', invoiceId);
    return invoice;
  }

  async recordPayment(
    invoiceId: string,
    payment: { txHash: string; amount: string; payerPublicKey: string; ledger: number; paidAt: Date },
    receivedAmount: string,
    paid: boolean,
  ): Promise<any> {
    const storage = await getStorage();
    const invoice = await storage.recordPayment(invoiceId, payment, receivedAmount, paid);
    if (!invoice) throw new Error('Invoice not found');
    return invoice;
  }

  /**
   * Get all invoices for a seller with cursor-based pagination
   */
  async getInvoicesBySeller(
    sellerPublicKey: string,
    status?: string,
    limit: number = DEFAULT_PAGE_LIMIT,
    cursor?: string
  ): Promise<{ invoices: any[]; nextCursor?: string; limit: number }> {
    const pageLimit = Number.isFinite(limit)
      ? Math.min(Math.max(Math.floor(limit), 1), MAX_PAGE_LIMIT)
      : DEFAULT_PAGE_LIMIT;

    const storage = await getStorage();
    let invoices = await storage.getAllInvoices(status ? { status } : undefined);

    if (sellerPublicKey) {
      invoices = invoices.filter((inv) => inv.sellerPublicKey === sellerPublicKey);
    }

    // Sort by createdAt descending for consistent pagination
    invoices.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

    let startIndex = 0;
    if (cursor) {
      const cursorIndex = invoices.findIndex(
        (inv) => inv.id === cursor
      );
      // A cursor that does not belong to this seller-scoped list cannot be
      // honoured; silently starting over would hide the mistake from callers.
      if (cursorIndex === -1) {
        throw Object.assign(new Error('Unknown cursor'), {
          status: 400,
          code: 'INVALID_CURSOR',
        });
      }
      startIndex = cursorIndex + 1;
    }

    const page = invoices.slice(startIndex, startIndex + pageLimit);
    const hasMore = startIndex + page.length < invoices.length;

    let nextCursor;
    if (hasMore && page.length > 0) {
      nextCursor = page[page.length - 1].id;
    }

    return { invoices: page, nextCursor, limit: pageLimit };
  }

  /**
   * Cancel an invoice
   */
  async cancelInvoice(invoiceId: string): Promise<any> {
    const storage = await getStorage();
    const invoice = await storage.getInvoiceById(invoiceId);

    if (!invoice || invoice.status !== 'PENDING') {
      throw new Error('Invoice not found or already processed');
    }

    return storage.updateInvoice(invoiceId, { status: 'CANCELLED' });
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
    const storage = await getStorage();
    const invoice = await storage.getInvoiceById(invoiceId);

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

    const updated = await storage.updateInvoice(invoiceId, updates);
    console.log('✅ Invoice expiry extended:', invoiceId);
    return updated;
  }

  /**
   * Mark expired invoices
   */
  async markExpiredInvoices(): Promise<number> {
    const storage = await getStorage();
    return storage.markExpiredInvoices();
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(sellerPublicKey: string): Promise<any> {
    const storage = await getStorage();
    return [await storage.getStats(sellerPublicKey)];
  }
}

export default new InvoiceMemoryService();

