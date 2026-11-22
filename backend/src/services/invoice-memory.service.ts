// Invoice service with in-memory storage
import { generateInvoiceMemo } from '../utils/memo';
import { CreateInvoiceInput } from '../utils/validation';
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
   * Update invoice status to PAID
   */
  async markAsPaid(invoiceId: string, txHash: string, payerPublicKey: string): Promise<any> {
    const invoice = memoryStorage.markAsPaid(invoiceId, txHash, payerPublicKey);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    console.log('✅ Invoice marked as paid:', invoiceId);
    return invoice;
  }

  /**
   * Get all invoices for a seller with cursor-based pagination
   */
  async getInvoicesBySeller(
    sellerPublicKey: string,
    status?: string,
    limit: number = 50,
    cursor?: string
  ): Promise<{ invoices: any[]; nextCursor?: string }> {
    let invoices = memoryStorage.getAllInvoices(status ? { status } : undefined);

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
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const page = invoices.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + page.length < invoices.length;

    let nextCursor;
    if (hasMore && page.length > 0) {
      nextCursor = page[page.length - 1].id;
    }

    return { invoices: page, nextCursor };
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

