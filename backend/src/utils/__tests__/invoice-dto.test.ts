import { describe, it, expect } from 'vitest';
import { toInvoiceDTO, type InvoiceDTO } from '../invoice-dto';

function makeInvoice(overrides: Partial<Parameters<typeof toInvoiceDTO>[0]> = {}) {
  return {
    id: 'inv-001',
    sellerPublicKey: 'GD5Q...ABCD',
    amount: 100,
    lineItems: [{ label: 'Test invoice', quantity: 1, unitPrice: 100 }],
    assetCode: 'XLM',
    assetIssuer: undefined,
    memo: 'memo-abc-123',
    description: 'Test invoice',
    customerName: 'Alice',
    customerEmail: 'alice@example.com',
    status: 'PENDING' as const,
    paymentTxHash: undefined,
    payerPublicKey: undefined,
    createdAt: new Date('2026-07-28T10:00:00Z'),
    paidAt: undefined,
    expiresAt: new Date('2026-08-04T10:00:00Z'),
    ...overrides,
  };
}

describe('toInvoiceDTO', () => {
  it('includes a muxed destination only for muxed invoices', () => {
    const muxed = toInvoiceDTO(makeInvoice({ sellerMuxedAddress: 'MSELLER' }));
    expect(muxed.sellerMuxedAddress).toBe('MSELLER');
    expect(toInvoiceDTO(makeInvoice())).not.toHaveProperty('sellerMuxedAddress');
  });

  it('maps all fields from a memory invoice to the DTO shape', () => {
    const invoice = makeInvoice();
    const result = toInvoiceDTO(invoice);

    expect(result).toEqual({
      id: 'inv-001',
      sellerPublicKey: 'GD5Q...ABCD',
      amount: 100,
      lineItems: [{ label: 'Test invoice', quantity: 1, unitPrice: 100 }],
      assetCode: 'XLM',
      assetIssuer: undefined,
      memo: 'memo-abc-123',
      description: 'Test invoice',
      customerName: 'Alice',
      customerEmail: 'alice@example.com',
      status: 'PENDING',
      paymentTxHash: undefined,
      payerPublicKey: undefined,
      ledger: undefined,
      createdAt: '2026-07-28T10:00:00.000Z',
      paidAt: undefined,
      refundTxHash: undefined,
      refundedAt: undefined,
      refundLedger: undefined,
      expiresAt: '2026-08-04T10:00:00.000Z',
      originalExpiresAt: '2026-08-04T10:00:00.000Z',
      expiryExtended: false,
      payments: [],
      receivedAmount: '0',
      remainingAmount: '100',
    });
  });

  it('serializes Date fields to ISO strings', () => {
    const createdAt = new Date('2025-01-15T08:30:00Z');
    const paidAt = new Date('2025-01-16T12:00:00Z');
    const expiresAt = new Date('2025-01-22T08:30:00Z');

    const invoice = makeInvoice({ createdAt, paidAt, expiresAt });
    const result = toInvoiceDTO(invoice);

    expect(result.createdAt).toBe('2025-01-15T08:30:00.000Z');
    expect(result.paidAt).toBe('2025-01-16T12:00:00.000Z');
    expect(result.expiresAt).toBe('2025-01-22T08:30:00.000Z');
  });

  it('omits paidAt when invoice is not yet paid', () => {
    const result = toInvoiceDTO(makeInvoice({ paidAt: undefined }));
    expect(result.paidAt).toBeUndefined();
  });

  it('includes paidAt when invoice is paid', () => {
    const paidAt = new Date('2025-01-16T12:00:00Z');
    const result = toInvoiceDTO(makeInvoice({ paidAt, status: 'PAID', paymentTxHash: 'tx-hash-123', payerPublicKey: 'GD6R...WXYZ' }));
    expect(result.paidAt).toBe('2025-01-16T12:00:00.000Z');
  });

  it('includes optional payer fields when present', () => {
    const result = toInvoiceDTO(makeInvoice({
      paymentTxHash: 'abc123',
      payerPublicKey: 'GD6R...WXYZ',
    }));

    expect(result.paymentTxHash).toBe('abc123');
    expect(result.payerPublicKey).toBe('GD6R...WXYZ');
  });

  it('omits optional payer fields when absent', () => {
    const result = toInvoiceDTO(makeInvoice());
    expect(result.paymentTxHash).toBeUndefined();
    expect(result.payerPublicKey).toBeUndefined();
  });

  it('includes optional assetIssuer when set', () => {
    const result = toInvoiceDTO(makeInvoice({ assetIssuer: 'GBPL...DEF' }));
    expect(result.assetIssuer).toBe('GBPL...DEF');
  });

  it('preserves the status enum value', () => {
    for (const status of ['PENDING', 'PAID', 'EXPIRED', 'CANCELLED'] as const) {
      const result = toInvoiceDTO(makeInvoice({ status }));
      expect(result.status).toBe(status);
    }
  });

  it('maps an EXPIRED invoice with correct ISO date serialization', () => {
    const result = toInvoiceDTO(makeInvoice({
      status: 'EXPIRED',
      expiresAt: new Date('2026-07-25T10:00:00Z'),
    }));

    expect(result).toEqual({
      id: 'inv-001',
      sellerPublicKey: 'GD5Q...ABCD',
      amount: 100,
      lineItems: [{ label: 'Test invoice', quantity: 1, unitPrice: 100 }],
      assetCode: 'XLM',
      assetIssuer: undefined,
      memo: 'memo-abc-123',
      description: 'Test invoice',
      customerName: 'Alice',
      customerEmail: 'alice@example.com',
      status: 'EXPIRED',
      paymentTxHash: undefined,
      payerPublicKey: undefined,
      ledger: undefined,
      createdAt: '2026-07-28T10:00:00.000Z',
      paidAt: undefined,
      refundTxHash: undefined,
      refundedAt: undefined,
      refundLedger: undefined,
      expiresAt: '2026-07-25T10:00:00.000Z',
      originalExpiresAt: '2026-07-25T10:00:00.000Z',
      expiryExtended: false,
      payments: [],
      receivedAmount: '0',
      remainingAmount: '100',
    });
  });

  it('maps a CANCELLED invoice with correct ISO date serialization', () => {
    const result = toInvoiceDTO(makeInvoice({
      status: 'CANCELLED',
      expiresAt: new Date('2026-07-20T10:00:00Z'),
    }));

    expect(result).toEqual({
      id: 'inv-001',
      sellerPublicKey: 'GD5Q...ABCD',
      amount: 100,
      lineItems: [{ label: 'Test invoice', quantity: 1, unitPrice: 100 }],
      assetCode: 'XLM',
      assetIssuer: undefined,
      memo: 'memo-abc-123',
      description: 'Test invoice',
      customerName: 'Alice',
      customerEmail: 'alice@example.com',
      status: 'CANCELLED',
      paymentTxHash: undefined,
      payerPublicKey: undefined,
      ledger: undefined,
      createdAt: '2026-07-28T10:00:00.000Z',
      paidAt: undefined,
      refundTxHash: undefined,
      refundedAt: undefined,
      refundLedger: undefined,
      expiresAt: '2026-07-20T10:00:00.000Z',
      originalExpiresAt: '2026-07-20T10:00:00.000Z',
      expiryExtended: false,
      payments: [],
      receivedAmount: '0',
      remainingAmount: '100',
    });
  });

  it('exposes original and extended expiry after a seller extension', () => {
    const result = toInvoiceDTO(
      makeInvoice({
        expiresAt: new Date('2026-08-20T10:00:00Z'),
        originalExpiresAt: new Date('2026-08-04T10:00:00Z'),
        expiryExtended: true,
      }),
    );

    expect(result.originalExpiresAt).toBe('2026-08-04T10:00:00.000Z');
    expect(result.expiresAt).toBe('2026-08-20T10:00:00.000Z');
    expect(result.expiryExtended).toBe(true);
  });

  it('locks the DTO field list to the current invoice-scoped keys', () => {
    const result = toInvoiceDTO(makeInvoice());

    expect(Object.keys(result).sort()).toEqual([
      'amount',
      'assetCode',
      'assetIssuer',
      'createdAt',
      'customerEmail',
      'customerName',
      'description',
      'expiresAt',
      'expiryExtended',
      'id',
      'ledger',
      'lineItems',
      'memo',
      'originalExpiresAt',
      'paidAt',
      'payerPublicKey',
      'paymentTxHash',
      'payments',
      'receivedAmount',
      'refundLedger',
      'refundTxHash',
      'refundedAt',
      'remainingAmount',
      'sellerPublicKey',
      'status',
    ]);
    expect(result).not.toHaveProperty('proofDigest');
    expect(result).not.toHaveProperty('proofCanonical');
  });

  it('exposes the invoice display label but never a seller email profile', () => {
    const invoice = {
      ...makeInvoice(),
      sellerName: 'Seller Co',
      sellerEmail: 'seller@example.com',
    };

    const result = toInvoiceDTO(invoice);

    const ownKeys = Object.keys(result);
    expect(result.sellerName).toBe('Seller Co');
    expect(ownKeys).not.toContain('sellerEmail');

    expect(result.customerName).toBe('Alice');
    expect(result.customerEmail).toBe('alice@example.com');
  });

  it('only exposes invoice-scoped wallet keys, no unrelated wallet fields', () => {
    const invoice = makeInvoice({
      sellerPublicKey: 'GD5Q...ABCD',
      payerPublicKey: 'GD6R...WXYZ',
    });
    const result = toInvoiceDTO(invoice);

    const ownKeys = Object.keys(result);
    expect(ownKeys).not.toContain('userId');
    expect(ownKeys).not.toContain('metadata');
    expect(ownKeys).not.toContain('total_revenue');
    expect(ownKeys).not.toContain('balance');

    expect(result.sellerPublicKey).toBe('GD5Q...ABCD');
    expect(result.payerPublicKey).toBe('GD6R...WXYZ');
  });
});
