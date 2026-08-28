import { describe, it, expect } from 'vitest';

import { createInvoiceSchema, stellarPublicKeySchema } from './validation';

const validSellerPublicKey = 'G' + 'A'.repeat(55);

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
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.includes('amount')),
      ).toBe(true);
    }
  });

  it('invalid stellar public key fails validation', () => {
    const result = stellarPublicKeySchema.safeParse('not-a-valid-public-key');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.message.includes('Invalid Stellar public key format'),
        ),
      ).toBe(true);
    }
  });

  it('invalid customer email fails validation', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 10,
      customerEmail: 'not-an-email',
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.path.includes('customerEmail'),
        ),
      ).toBe(true);
    }
  });
});
