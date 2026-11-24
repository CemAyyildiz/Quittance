/**
 * Tests for invoice PDF export (issue #989)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openInvoicePDF, generateInvoicePDF } from '../export';

// Mock html2pdf.js
const mockSave = vi.fn();
const mockFrom = vi.fn(() => ({ save: mockSave }));
const mockSet = vi.fn(() => ({ from: mockFrom }));
const mockHtml2pdf = vi.fn(() => ({ set: mockSet }));

vi.mock('html2pdf.js', () => ({
  default: mockHtml2pdf,
}));

describe('Invoice PDF Export (Issue #989)', () => {
  const paidInvoice = {
    id: 'test-invoice-123',
    amount: 100.50,
    assetCode: 'XLM',
    memo: 'TEST-MEMO-001',
    status: 'PAID',
    paymentTxHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    sellerPublicKey: 'GTEST1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    payerPublicKey: 'GPAYER1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    customerName: 'Test Customer',
    customerEmail: 'customer@example.com',
    description: 'Test payment',
    createdAt: '2024-01-01T00:00:00Z',
    expiresAt: '2024-01-08T00:00:00Z',
    paidAt: '2024-01-02T12:00:00Z',
  };

  const paidInvoiceWithIssuer = {
    ...paidInvoice,
    assetCode: 'USDC',
    assetIssuer: 'GISSUER1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  };

  const unpaidInvoice = {
    ...paidInvoice,
    status: 'PENDING',
    paymentTxHash: undefined,
    payerPublicKey: undefined,
    paidAt: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock document methods
    document.createElement = vi.fn((tagName: string) => {
      const element = {
        innerHTML: '',
        style: {},
        remove: vi.fn(),
      };
      return element as any;
    });

    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
  });

  it('should only allow PDF generation for paid invoices', async () => {
    await expect(openInvoicePDF(unpaidInvoice as any)).rejects.toThrow(
      'PDF proof is only available for paid invoices'
    );
  });

  it('should generate PDF with filename including invoice number and UTC paid date', async () => {
    await openInvoicePDF({ ...paidInvoice, invoiceNumber: 'INV-99' } as any);

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'invoice-proof-INV-99-2024-01-02.pdf',
      })
    );
  });

  it('should fall back to invoice id in filename when number is missing', async () => {
    await openInvoicePDF(paidInvoice as any);

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: `invoice-proof-${paidInvoice.id}-2024-01-02.pdf`,
      })
    );
  });

  it('should include all required fields in PDF content', () => {
    const pdfContent = generateInvoicePDF(paidInvoice as any);

    // Check that all required fields are present
    expect(pdfContent).toContain(paidInvoice.amount.toString());
    expect(pdfContent).toContain(paidInvoice.assetCode);
    expect(pdfContent).toContain(paidInvoice.memo);
    expect(pdfContent).toContain(paidInvoice.paymentTxHash);
    expect(pdfContent).toContain(paidInvoice.sellerPublicKey);
    expect(pdfContent).toContain(paidInvoice.payerPublicKey);
  });

  it('should include Stellar Expert link for paid invoices', () => {
    const pdfContent = generateInvoicePDF(paidInvoice as any);

    // Should contain Stellar Expert link
    expect(pdfContent).toContain('stellar.expert');
    expect(pdfContent).toContain('blockchain-info');
    expect(pdfContent).toContain('Payment Verified');
  });

  it('should include asset issuer when present and asset is non-native', () => {
    const pdfContent = generateInvoicePDF(paidInvoiceWithIssuer as any);

    expect(pdfContent).toContain('USDC');
    expect(pdfContent).toContain(paidInvoiceWithIssuer.assetIssuer);
    expect(pdfContent).toContain('Asset Issuer');
  });

  it('should not include asset issuer for native XLM', () => {
    const pdfContent = generateInvoicePDF(paidInvoice as any);

    expect(pdfContent).toContain('XLM');
    expect(pdfContent).not.toContain('Asset Issuer');
  });

  it('should handle missing payer name and email gracefully', () => {
    const invoiceWithoutPayerInfo = {
      ...paidInvoice,
      payerName: undefined,
      payerEmail: undefined,
    };

    const pdfContent = generateInvoicePDF(invoiceWithoutPayerInfo as any);

    // Should not render undefined
    expect(pdfContent).not.toContain('undefined');
    // Should still have payer address
    expect(pdfContent).toContain(paidInvoice.payerPublicKey);
  });

  it('should wrap long addresses within page boundaries', () => {
    const pdfContent = generateInvoicePDF(paidInvoice as any);

    // Check that word-break: break-all is applied to long addresses
    expect(pdfContent).toContain('word-break: break-all');
  });

  it('should not trigger popup (use direct download)', async () => {
    await openInvoicePDF(paidInvoice as any);

    // html2pdf's save method should be called (downloads directly)
    expect(mockSave).toHaveBeenCalled();
  });

  it('should create temporary container off-screen during PDF generation', async () => {
    await openInvoicePDF(paidInvoice as any);

    expect(document.createElement).toHaveBeenCalledWith('div');
    expect(document.body.appendChild).toHaveBeenCalled();
    expect(document.body.removeChild).toHaveBeenCalled();
  });

  it('should cleanup temporary container even if PDF generation fails', async () => {
    mockSave.mockRejectedValueOnce(new Error('PDF generation failed'));

    await expect(openInvoicePDF(paidInvoice as any)).rejects.toThrow();
    
    expect(document.body.removeChild).toHaveBeenCalled();
  });
});
