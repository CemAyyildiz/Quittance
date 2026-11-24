// Invoice service with in-memory storage
import { generateInvoiceMemo, validateMemoByteLength } from '../utils/memo';
import { CreateInvoiceInput } from '../utils/validation';
import { assertCanExtendExpiry } from '../utils/invoice-expiry';
import { getStorage } from '../storage/storage-factory';
import type { InvoiceStore } from '../storage/storage-factory';
import type { StatusEvent, StatusEventStatus } from '../storage/memory-storage';
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '../utils/parse-pagination';
import {
  AnchorError,
  AnchorErrorCode,
  canonicalDigestMatches,
} from '../utils/canonical-proof';
import { queueInvoicePaidWebhook } from './webhook.service';

class InvoiceMemoryService {
  /**
   * Create a new invoice
   */
  async createInvoice(input: CreateInvoiceInput & { lineItems?: unknown[] }): Promise<any> {
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
      lineItems: input.lineItems,
      assetCode: input.assetCode || 'XLM',
      assetIssuer: input.assetIssuer,
      lineItems: input.lineItems,
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

  /** Create a fresh, unpaid copy owned by the requesting seller. */
  async duplicateInvoice(
    invoiceId: string,
    sellerPublicKey: string,
    copyCustomerEmail = false,
  ): Promise<any> {
    const storage = await getStorage();
    const source = await storage.getInvoiceById(invoiceId);
    if (!source || source.sellerPublicKey !== sellerPublicKey) {
      throw Object.assign(new Error('Invoice not found'), { code: 'NOT_FOUND', status: 404 });
    }

    return this.createInvoice({
      sellerPublicKey,
      amount: source.amount,
      assetCode: source.assetCode,
      assetIssuer: source.assetIssuer,
      description: source.description,
      lineItems: source.lineItems,
      customerName: source.customerName,
      customerEmail: copyCustomerEmail ? source.customerEmail : undefined,
      expiresInDays: 7,
    });
  }

  /**
   * Update invoice status to PAID
   */
  async markAsPaid(
    invoiceId: string,
    txHash: string,
    payerPublicKey: string,
    ledgerSeq?: number,
    paidAt?: Date
  ): Promise<any> {
    const storage = await getStorage();
    const existingInvoice = await storage.getInvoiceById(invoiceId);
    if (!existingInvoice) {
      throw new Error('Invoice not found');
    }

    if (existingInvoice.status === 'PAID') {
      return existingInvoice;
    }

    if (ledgerSeq === undefined || ledgerSeq === null || !Number.isFinite(ledgerSeq)) {
      throw new Error('Ledger sequence is required to mark invoice as paid');
    }

    const invoice = await storage.markAsPaid(invoiceId, txHash, payerPublicKey, {
      ledger: ledgerSeq,
      paidAt,
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    console.log('✅ Invoice marked as paid:', invoiceId);

    queueInvoicePaidWebhook(invoice);

    return invoice;
  }

  /**
   * Get all invoices for a seller with cursor-based pagination.
   * Search runs inside the seller-scoped list and before the page is cut, so a
   * match on any invoice is returned even when it is not on the current page.
   */
  async getInvoicesBySeller(
    sellerPublicKey: string,
    status?: string,
    limit: number = DEFAULT_PAGE_LIMIT,
    cursor?: string,
    filters: {
      assetCode?: string;
      createdFrom?: Date;
      createdTo?: Date;
    } = {}
    search?: string
  ): Promise<{ invoices: any[]; nextCursor?: string; limit: number }> {
    const pageLimit = Number.isFinite(limit)
      ? Math.min(Math.max(Math.floor(limit), 1), MAX_PAGE_LIMIT)
      : DEFAULT_PAGE_LIMIT;

    const storage = await getStorage();
    let invoices = await storage.getAllInvoices(status ? { status } : undefined);

    invoices = invoices.filter(
      (invoice) => invoice.sellerPublicKey === sellerPublicKey
    );
    if (status) {
      invoices = invoices.filter((invoice) => invoice.status === status);
    }
    if (filters.assetCode) {
      invoices = invoices.filter(
        (invoice) => invoice.assetCode === filters.assetCode
      );
    }
    if (filters.createdFrom) {
      invoices = invoices.filter(
        (invoice) => invoice.createdAt >= filters.createdFrom!
      );
    }
    if (filters.createdTo) {
      invoices = invoices.filter(
        (invoice) => invoice.createdAt <= filters.createdTo!
      );
    }

    if (search) {
      const query = search.toLowerCase();
      invoices = invoices.filter((inv) => {
        const matchesInvoiceNumber = String(inv.id).toLowerCase().includes(query);
        // A memo is an exact reference, not free text: a substring must not
        // surface unrelated invoices that merely share a few characters.
        const matchesMemo = String(inv.memo).toLowerCase() === query;
        const matchesCustomerName = Boolean(
          inv.customerName && String(inv.customerName).toLowerCase().includes(query)
        );
        const matchesSellerName = Boolean(
          (inv as any).sellerName && String((inv as any).sellerName).toLowerCase().includes(query)
        );
        return matchesInvoiceNumber || matchesMemo || matchesCustomerName || matchesSellerName;
      });
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

  getPendingInvoices(): any[] {
    return memoryStorage.getAllInvoices({ status: 'PENDING' });
  }

  /**
   * Cancel an invoice
   */
  async cancelInvoice(invoiceId: string, sellerPublicKey: string): Promise<any> {
    const storage = await getStorage();
    const invoice = await storage.getInvoiceById(invoiceId);

    if (!invoice) {
      throw Object.assign(new Error('Invoice not found'), {
        code: 'NOT_FOUND',
        status: 404,
      });
    }

    if (invoice.sellerPublicKey !== sellerPublicKey) {
      throw Object.assign(new Error('Only the owning seller can void this invoice'), {
        code: 'NOT_OWNER',
        status: 403,
      });
    }

    if (invoice.status === 'CANCELLED') return invoice;

    if (invoice.status !== 'PENDING') {
      throw Object.assign(new Error('Only a pending invoice can be voided'), {
        code: 'NOT_VOIDABLE',
        status: 400,
      });
    }

    return storage.updateInvoice(invoiceId, { status: 'CANCELLED' });
  }

  /** Mark a pending invoice as uncollectible for its owning seller. */
  async markUncollectible(invoiceId: string, sellerPublicKey: string): Promise<any> {
    const storage = await getStorage();
    const invoice = await storage.getInvoiceById(invoiceId);

    if (!invoice || invoice.sellerPublicKey !== sellerPublicKey) {
      throw Object.assign(new Error('Invoice not found'), { code: 'NOT_FOUND', status: 404 });
    }

    if (invoice.status === 'UNCOLLECTIBLE') return invoice;
    if (invoice.status !== 'PENDING') {
      throw Object.assign(new Error('Only pending invoices can be marked uncollectible'), {
        code: 'NOT_PENDING',
        status: 400,
      });
    }

    return storage.updateInvoice(invoiceId, { status: 'UNCOLLECTIBLE' });
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
   * The active backend, narrowed to the append-only history methods.
   */
  private async historyStore(): Promise<
    InvoiceStore & Required<Pick<InvoiceStore, 'appendStatusEvent' | 'getStatusHistory'>>
  > {
    const storage = await getStorage();
    if (!storage.appendStatusEvent || !storage.getStatusHistory) {
      throw new Error('Status history is not supported by this storage backend');
    }
    return storage as InvoiceStore &
      Required<Pick<InvoiceStore, 'appendStatusEvent' | 'getStatusHistory'>>;
  }

  /**
   * Append a lifecycle event to an invoice's audit trail.
   */
  async recordStatusEvent(
    invoiceId: string,
    status: StatusEventStatus,
    txHash?: string,
  ): Promise<StatusEvent[]> {
    const storage = await getStorage();
    if (!(await storage.getInvoiceById(invoiceId))) {
      throw new Error('Invoice not found');
    }
    const history = await this.historyStore();
    await history.appendStatusEvent(invoiceId, status, txHash);
    return history.getStatusHistory(invoiceId);
  }

  /**
   * Status history for the owning seller, oldest first. The rows contain only
   * status / time / optional transaction hash — never customer contact data.
   */
  async getStatusHistory(invoiceId: string): Promise<StatusEvent[]> {
    const storage = await getStorage();
    if (!(await storage.getInvoiceById(invoiceId))) {
      throw new Error('Invoice not found');
    }
    const history = await this.historyStore();
    return history.getStatusHistory(invoiceId);
  }

  /** Extend the settlement window and record the EXTENDED transition. */
  async extendInvoice(invoiceId: string, days: number): Promise<any> {
    const storage = await getStorage();
    const invoice = await storage.getInvoiceById(invoiceId);
    if (!invoice || invoice.status !== 'PENDING') {
      throw new Error('Invoice not found or not pending');
    }

    const expiresAt = new Date(invoice.expiresAt);
    expiresAt.setDate(expiresAt.getDate() + days);
    const updated = await storage.updateInvoice(invoiceId, { expiresAt });

    const history = await this.historyStore();
    await history.appendStatusEvent(invoiceId, 'EXTENDED');
    return updated;
  }

  /** Record a partial payment without moving the invoice to PAID. */
  async recordPartialPayment(invoiceId: string, txHash?: string): Promise<any> {
    const storage = await getStorage();
    const invoice = await storage.getInvoiceById(invoiceId);
    if (!invoice || invoice.status !== 'PENDING') {
      throw new Error('Invoice not found or not pending');
    }

    const history = await this.historyStore();
    await history.appendStatusEvent(invoiceId, 'PARTIALLY_PAID', txHash);
    return invoice;
  }

  /** Record a refund of a previously paid invoice. */
  async recordRefund(invoiceId: string, txHash?: string): Promise<any> {
    const storage = await getStorage();
    const invoice = await storage.getInvoiceById(invoiceId);
    if (!invoice || invoice.status !== 'PAID') {
      throw new Error('Invoice not found or not paid');
    }

    const history = await this.historyStore();
    await history.appendStatusEvent(invoiceId, 'REFUNDED', txHash);
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
    const storage = await getStorage();
    const invoice = await storage.getInvoiceById(invoiceId);
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

    const updated = await storage.updateInvoice(invoiceId, { anchoringTxHash: txHash });
    if (!updated) {
      throw new AnchorError(AnchorErrorCode.INVOICE_NOT_FOUND, 'Invoice not found');
    }
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

