import { describe, it, expect } from 'vitest';
import { toInvoiceDTO, type InvoiceDTO } from '../invoice-dto';

function makeInvoice(overrides: Partial<Parameters<typeof toInvoiceDTO>[0]> = {}) {
  return {
    id: 'inv-001',
    sellerPublicKey: 'GD5Q...ABCD',
    amount: 100,
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
  it('maps all fields from a memory invoice to the DTO shape', () => {
    const invoice = makeInvoice();
    const result = toInvoiceDTO(invoice);

    expect(result).toEqual({
      id: 'inv-001',
      sellerPublicKey: 'GD5Q...ABCD',
      amount: 100,
      assetCode: 'XLM',
      assetIssuer: undefined,
      memo: 'memo-abc-123',
      description: 'Test invoice',
      customerName: 'Alice',
      customerEmail: 'alice@example.com',
      status: 'PENDING',
      paymentTxHash: undefined,
      payerPublicKey: undefined,
      createdAt: '2026-07-28T10:00:00.000Z',
      paidAt: undefined,
      expiresAt: '2026-08-04T10:00:00.000Z',
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
      assetCode: 'XLM',
      assetIssuer: undefined,
      memo: 'memo-abc-123',
      description: 'Test invoice',
      customerName: 'Alice',
      customerEmail: 'alice@example.com',
      status: 'EXPIRED',
      paymentTxHash: undefined,
      payerPublicKey: undefined,
      createdAt: '2026-07-28T10:00:00.000Z',
      paidAt: undefined,
      expiresAt: '2026-07-25T10:00:00.000Z',
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
      assetCode: 'XLM',
      assetIssuer: undefined,
      memo: 'memo-abc-123',
      description: 'Test invoice',
      customerName: 'Alice',
      customerEmail: 'alice@example.com',
      status: 'CANCELLED',
      paymentTxHash: undefined,
      payerPublicKey: undefined,
      createdAt: '2026-07-28T10:00:00.000Z',
      paidAt: undefined,
      expiresAt: '2026-07-20T10:00:00.000Z',
    });
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
