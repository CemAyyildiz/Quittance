import { describe, it, expect } from 'vitest';

import { createInvoiceSchema, paymentSchema, stellarPublicKeySchema } from './validation';

const validSellerPublicKey = 'G' + 'A'.repeat(55);
const validInvoiceId = '123e4567-e89b-12d3-a456-426614174000';
const validTxHash = 'a'.repeat(64);

describe('createInvoiceSchema', () => {
  it('accepts a valid invoice payload', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 125,
      description: 'Website redesign',
      customerName: 'Alice Example',
      customerEmail: 'alice@example.com',
      sellerName: 'Quittance Labs',
      sellerEmail: 'seller@example.com',
      expiresInDays: 14,
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid (zero) amount', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 0,
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected invalid amount to fail validation');
    }
    expect(
      result.error.issues.some((issue) => issue.path.includes('amount')),
    ).toBe(true);
  });

  it('rejects an invalid customer email', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 10,
      customerEmail: 'not-an-email',
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected invalid email to fail validation');
    }
    expect(
      result.error.issues.some((issue) => issue.path.includes('customerEmail')),
    ).toBe(true);
  });

  it('rejects expiresInDays of 0', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 10,
      expiresInDays: 0,
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected expiresInDays of 0 to fail validation');
    }
    expect(
      result.error.issues.some((issue) => issue.path.includes('expiresInDays')),
    ).toBe(true);
  });

  it('rejects expiresInDays of 366', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 10,
      expiresInDays: 366,
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected expiresInDays of 366 to fail validation');
    }
    expect(
      result.error.issues.some((issue) => issue.path.includes('expiresInDays')),
    ).toBe(true);
  });

  it('accepts expiresInDays of 1', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 10,
      expiresInDays: 1,
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(true);
  });

  it('accepts expiresInDays of 365', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 10,
      expiresInDays: 365,
      sellerPublicKey: validSellerPublicKey,
    });


  it('rejects amount above max ceiling (1000000001)', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 1000000001,
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected amount above max to fail validation');
    }
    expect(
      result.error.issues.some((issue) => issue.path.includes('amount')),
    ).toBe(true);
  });

  it('accepts amount at max ceiling (1000000000)', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 1000000000,
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(true);
  });
    expect(result.success).toBe(true);
  });
});

describe('stellarPublicKeySchema', () => {
  it('rejects a malformed Stellar public key', () => {
    const result = stellarPublicKeySchema.safeParse('not-a-valid-public-key');

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected an invalid public key to fail validation');
    }
    expect(
      result.error.issues.some((issue) =>
        issue.message.includes('Invalid Stellar public key format'),
      ),
    ).toBe(true);
  });
});

describe('paymentSchema', () => {
  const validPaymentPayload = {
    invoiceId: validInvoiceId,
    txHash: validTxHash,
    payerPublicKey: validSellerPublicKey,
    amount: 100,
  };

  it('valid payment payload passes validation', () => {
    const result = paymentSchema.safeParse(validPaymentPayload);
    expect(result.success).toBe(true);
  });

  it('fails when txHash is too short (63 chars)', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      txHash: 'a'.repeat(63),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('txHash'))).toBe(true);
    }
  });

  it('fails when txHash is too long (65 chars)', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      txHash: 'a'.repeat(65),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('txHash'))).toBe(true);
    }
  });

  it('fails when txHash is empty', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      txHash: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('txHash'))).toBe(true);
    }
  });

  it('fails when invoiceId is not a valid UUID', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      invoiceId: 'not-a-uuid',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('invoiceId'))).toBe(true);
    }
  });

  it('fails when payerPublicKey is invalid', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      payerPublicKey: 'not-a-valid-public-key',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('payerPublicKey'))).toBe(true);
    }
  });

  it('fails when amount is zero', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      amount: 0,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('amount'))).toBe(true);
    }
  });

  it('fails when amount is negative', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      amount: -50,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('amount'))).toBe(true);
    }
  });

  it('fails when amount is not a number', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      amount: '100' as unknown as number,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('amount'))).toBe(true);
    }
  });

  it('fails when invoiceId is empty', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      invoiceId: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('invoiceId'))).toBe(true);
    }
  });

  it('fails when payerPublicKey is too short', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      payerPublicKey: 'G' + 'A'.repeat(54), // 55 chars
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('payerPublicKey'))).toBe(true);
    }
  });

  it('fails when payerPublicKey is too long', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      payerPublicKey: 'G' + 'A'.repeat(56), // 57 chars
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('payerPublicKey'))).toBe(true);
    }
  });

  it('fails when payerPublicKey has invalid prefix', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      payerPublicKey: 'X' + 'A'.repeat(55),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('payerPublicKey'))).toBe(true);
    }
  });

  it('fails when required fields are missing', () => {
    const result = paymentSchema.safeParse({
      invoiceId: validInvoiceId,
    } as unknown as Record<string, unknown>);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('txHash'))).toBe(true);
      expect(result.error.issues.some((issue) => issue.path.includes('payerPublicKey'))).toBe(true);
      expect(result.error.issues.some((issue) => issue.path.includes('amount'))).toBe(true);
    }
  });

  it('accepts valid payload with minimal positive amount', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      amount: 0.0000001,
    });
    expect(result.success).toBe(true);
  });
});
