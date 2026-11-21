// Invoice service with in-memory storage
import { generateInvoiceMemo } from '../utils/memo';
import { CreateInvoiceInput } from '../utils/validation';
import memoryStorage from '../storage/memory-storage';
import { buildWebhookPayload, sendWebhookWithRetry, isWebhookSent, markWebhookSent } from '../utils/webhook';

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
   *
   * Sends a webhook POST to WEBHOOK_URL if configured, with HMAC-SHA256 signature.
   * A missing or empty WEBHOOK_SECRET disables delivery (logged but not fatal).
   * Paying the same invoice twice does not send a second webhook.
   */
  async markAsPaid(invoiceId: string, txHash: string, payerPublicKey: string): Promise<any> {
    const invoice = memoryStorage.markAsPaid(invoiceId, txHash, payerPublicKey);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Check if webhook should be sent
    const webhookUrl = process.env.WEBHOOK_URL;
    const webhookSecret = process.env.WEBHOOK_SECRET;

    // Don't send webhook if URL is not configured or secret is missing
    if (!webhookUrl || !webhookSecret) {
      const reason = !webhookUrl ? 'WEBHOOK_URL not set' : 'WEBHOOK_SECRET not set';
      console.log(`Webhook delivery skipped: ${reason}`);
      console.log('✅ Invoice marked as paid:', invoiceId);
      return invoice;
    }

    // Don't send second webhook for the same invoice
    if (isWebhookSent(invoice.id)) {
      console.log(`Webhook already sent for invoice ${invoice.id}; skipping duplicate`);
      console.log('✅ Invoice marked as paid:', invoiceId);
      return invoice;
    }

    // Build and send webhook payload
    const payload = buildWebhookPayload(invoice);
    const result = await sendWebhookWithRetry(webhookUrl, payload, webhookSecret);

    if (result.success) {
      markWebhookSent(invoice.id);
      console.log(`Webhook sent successfully for invoice ${invoice.id}`);
    } else {
      // Log the error but don't fail the invoice - it stays paid either way
      console.error(`Webhook delivery failed for invoice ${invoice.id}: ${result.error.message}`);
    }

    console.log('✅ Invoice marked as paid:', invoiceId);
    return invoice;
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

