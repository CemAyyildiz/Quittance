import { describe, it, expect } from 'vitest';

import { createInvoiceSchema, paymentSchema, stellarPublicKeySchema } from './validation';

const validSellerPublicKey = 'G' + 'A'.repeat(55);
const validInvoiceId = '123e4567-e89b-12d3-a456-426614174000';
const validTxHash = 'a'.repeat(64);

describe('createInvoiceSchema', () => {
  it('valid invoice payload passes validation', () => {
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

  it('invalid invoice amount fails validation', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 0,
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected invalid amount to fail validation');

    expect(result.error.issues.some((issue) => issue.path.includes('amount'))).toBe(true);
  });

  it('invalid stellar public key fails validation', () => {
    const result = stellarPublicKeySchema.safeParse('not-a-valid-public-key');

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected an invalid public key to fail validation');

    expect(
      result.error.issues.some((issue) => issue.message.includes('Invalid Stellar public key format')),
    ).toBe(true);
  });

  it('invalid customer email fails validation', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 10,
      customerEmail: 'not-an-email',
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected an invalid email to fail validation');

    expect(result.error.issues.some((issue) => issue.path.includes('customerEmail'))).toBe(true);
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
    if (result.success) throw new Error('Expected short txHash to fail');
    expect(result.error.issues.some((issue) => issue.path.includes('txHash'))).toBe(true);
  });

  it('fails when txHash is too long (65 chars)', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      txHash: 'a'.repeat(65),
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected long txHash to fail');
    expect(result.error.issues.some((issue) => issue.path.includes('txHash'))).toBe(true);
  });

  it('fails when txHash is empty', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      txHash: '',
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected empty txHash to fail');
    expect(result.error.issues.some((issue) => issue.path.includes('txHash'))).toBe(true);
  });

  it('fails when invoiceId is not a valid UUID', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      invoiceId: 'not-a-uuid',
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected invalid UUID to fail');
    expect(result.error.issues.some((issue) => issue.path.includes('invoiceId'))).toBe(true);
  });

  it('fails when invoiceId is empty', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      invoiceId: '',
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected empty invoiceId to fail');
    expect(result.error.issues.some((issue) => issue.path.includes('invoiceId'))).toBe(true);
  });

  it('fails when payerPublicKey is invalid', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      payerPublicKey: 'not-a-valid-public-key',
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected invalid payerPublicKey to fail');
    expect(result.error.issues.some((issue) => issue.path.includes('payerPublicKey'))).toBe(true);
  });

  it('fails when payerPublicKey has wrong length', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      payerPublicKey: 'G' + 'A'.repeat(54), // 55 chars, needs 56
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected wrong-length key to fail');
    expect(result.error.issues.some((issue) => issue.path.includes('payerPublicKey'))).toBe(true);
  });

  it('fails when amount is zero', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      amount: 0,
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected zero amount to fail');
    expect(result.error.issues.some((issue) => issue.path.includes('amount'))).toBe(true);
  });

  it('fails when amount is negative', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      amount: -10,
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected negative amount to fail');
    expect(result.error.issues.some((issue) => issue.path.includes('amount'))).toBe(true);
  });

  it('fails when amount is not a positive number (string)', () => {
    const result = paymentSchema.safeParse({
      ...validPaymentPayload,
      amount: '100' as unknown as number,
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected string amount to fail');
    expect(result.error.issues.some((issue) => issue.path.includes('amount'))).toBe(true);
  });
});
