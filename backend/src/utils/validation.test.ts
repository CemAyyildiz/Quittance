import { describe, it, expect } from 'vitest';

import { createInvoiceSchema, parseAmount, paymentSchema, stellarPublicKeySchema } from './validation';

const validSellerPublicKey = 'G' + 'A'.repeat(55);
const validInvoiceId = '123e4567-e89b-12d3-a456-426614174000';
const validTxHash = 'a'.repeat(64);

describe('createInvoiceSchema', () => {
  it('accepts matching line items and rejects a mismatched total', () => {
    const matching = createInvoiceSchema.safeParse({
      amount: 25,
      lineItems: [
        { label: 'Design', quantity: 2, unitPrice: 10 },
        { label: 'Consulting', quantity: 1, unitPrice: 5 },
      ],
      sellerPublicKey: validSellerPublicKey,
    });
    expect(matching.success).toBe(true);

    const mismatched = createInvoiceSchema.safeParse({
      amount: 24,
      lineItems: [
        { label: 'Design', quantity: 2, unitPrice: 10 },
        { label: 'Consulting', quantity: 1, unitPrice: 5 },
      ],
      sellerPublicKey: validSellerPublicKey,
    });
    expect(mismatched.success).toBe(false);
  });

  it('rejects zero values and more than 20 line items', () => {
    expect(createInvoiceSchema.safeParse({
      amount: 0,
      lineItems: [{ label: 'Zero', quantity: 0, unitPrice: 1 }],
      sellerPublicKey: validSellerPublicKey,
    }).success).toBe(false);

    const overCap = createInvoiceSchema.safeParse({
      amount: 21,
      lineItems: Array.from({ length: 21 }, (_, index) => ({
        label: `Line ${index + 1}`,
        quantity: 1,
        unitPrice: 1,
      })),
      sellerPublicKey: validSellerPublicKey,
    });
    expect(overCap.success).toBe(false);
    if (!overCap.success) {
      expect(
        overCap.error.issues.some(
          (issue) =>
            issue.path.includes('lineItems') &&
            issue.message.toLowerCase().includes('too long'),
        ),
      ).toBe(true);
    }
  });

  it('accepts exactly 20 line items when they sum to the amount and accepts empty line items', () => {
    const twentyItemsFixture = Array.from({ length: 20 }, (_, index) => ({
      label: `Service ${index + 1}`,
      quantity: 1,
      unitPrice: 2.5,
    }));

    const atCap = createInvoiceSchema.safeParse({
      amount: 50,
      lineItems: twentyItemsFixture,
      sellerPublicKey: validSellerPublicKey,
    });
    expect(atCap.success).toBe(true);

    const atCapMismatch = createInvoiceSchema.safeParse({
      amount: 49,
      lineItems: twentyItemsFixture,
      sellerPublicKey: validSellerPublicKey,
    });
    expect(atCapMismatch.success).toBe(false);

    const emptyList = createInvoiceSchema.safeParse({
      amount: 50,
      lineItems: [],
      sellerPublicKey: validSellerPublicKey,
    });
    expect(emptyList.success).toBe(true);
  });

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

  it('accepts a memo of exactly 28 bytes and rejects 29', () => {
    const validResult = createInvoiceSchema.safeParse({
      amount: 10,
      memo: 'a'.repeat(28),
      sellerPublicKey: validSellerPublicKey,
    });
    expect(validResult.success).toBe(true);

    const invalidResult = createInvoiceSchema.safeParse({
      amount: 10,
      memo: 'a'.repeat(29),
      sellerPublicKey: validSellerPublicKey,
    });
    expect(invalidResult.success).toBe(false);
    if (invalidResult.success) {
      throw new Error('Expected a 29-byte memo to fail validation');
    }
    expect(invalidResult.error.issues.some((issue) => issue.path.includes('memo'))).toBe(true);
  });

  it('rejects a memo whose UTF-8 length exceeds 28 bytes', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 10,
      memo: 'é'.repeat(15), // 15 characters, 30 bytes
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected a multi-byte memo over 28 bytes to fail validation');
    }
    expect(result.error.issues.some((issue) => issue.path.includes('memo'))).toBe(true);
  });

  it('accepts a valid USDC invoice with a Stellar issuer', () => {
    const issuer = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
    const result = createInvoiceSchema.safeParse({
      amount: 25.5,
      assetCode: 'USDC',
      assetIssuer: issuer,
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected a valid USDC invoice to pass validation');
    }
    expect(result.data.assetIssuer).toBe(issuer);
  });

  it('drops an explicit issuer when the asset is native XLM', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 10,
      assetCode: 'XLM',
      assetIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected a native XLM invoice to pass validation');
    }
    expect(result.data.assetCode).toBe('XLM');
    expect(result.data.assetIssuer).toBeUndefined();
  });

  it('ignores an issuer for a native XLM invoice even when it is malformed', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 10,
      assetCode: 'XLM',
      assetIssuer: 'not-a-stellar-issuer',
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected an ignored malformed XLM issuer to pass validation');
    }
    expect(result.data.assetIssuer).toBeUndefined();
  });

  it('drops an explicit issuer when the asset code is omitted (native XLM default)', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 10,
      assetIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected a default XLM invoice to pass validation');
    }
    expect(result.data.assetIssuer).toBeUndefined();
    if (result.success) {
      expect(result.data.assetCode).toBe('XLM');
    }
  });

  it('uppercases a lowercase asset code and stores no issuer rewrite', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 25.5,
      assetCode: 'usdc',
      assetIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assetCode).toBe('USDC');
      expect(result.data.assetIssuer).toBe('GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');
    }
  });

  it('rejects a credit asset without an issuer and names the asset', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 25.5,
      assetCode: 'usdc',
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) =>
        issue.path.includes('assetIssuer') && issue.message.includes('USDC'),
      )).toBe(true);
    }
  });

  it('accepts XLM without an issuer', () => {
    expect(createInvoiceSchema.safeParse({
      amount: 25.5,
      assetCode: 'XLM',
      sellerPublicKey: validSellerPublicKey,
    }).success).toBe(true);
  });

  it('rejects asset codes longer than 12 characters and accepts 12', () => {
    expect(createInvoiceSchema.safeParse({
      amount: 25.5,
      assetCode: 'ABCDEFGHIJKLM',
      assetIssuer: validSellerPublicKey,
      sellerPublicKey: validSellerPublicKey,
    }).success).toBe(false);

    expect(createInvoiceSchema.safeParse({
      amount: 25.5,
      assetCode: 'ABCDEFGHIJKL',
      assetIssuer: validSellerPublicKey,
      sellerPublicKey: validSellerPublicKey,
    }).success).toBe(true);
  });

  it('rejects a USDC invoice with a malformed issuer', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 25.5,
      assetCode: 'USDC',
      assetIssuer: 'not-a-stellar-issuer',
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected malformed USDC issuer to fail validation');
    }
    expect(result.error.issues.some((issue) => issue.path.includes('assetIssuer'))).toBe(true);
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

  it('rejects an expiry that is already in the past', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 10,
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected a past expiry to fail validation');
    }
    expect(
      result.error.issues.some((issue) => issue.path.includes('expiresAt')),
    ).toBe(true);
  });

  it('accepts an expiry one hour in the future', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 10,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(true);
  });

  it('keeps the default expiry when none is supplied', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 10,
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.expiresAt).toBeUndefined();
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

    expect(result.success).toBe(true);
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

  it('rejects an amount with more than seven decimal places', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 1.12345678,
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected an eight-decimal amount to fail validation');
    }
    expect(result.error.issues.some((issue) => issue.path.includes('amount'))).toBe(true);
  });

  it('accepts an amount with exactly seven decimal places', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 1.1234567,
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(true);
  });

  it('rejects trailing zeros beyond seven decimal places instead of rounding', () => {
    const result = createInvoiceSchema.safeParse({
      amount: '1.10000000',
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(false);
  });

  it('counts decimals after a comma separator', () => {
    expect(
      createInvoiceSchema.safeParse({
        amount: '1,1234567',
        sellerPublicKey: validSellerPublicKey,
      }).success,
    ).toBe(true);

    expect(
      createInvoiceSchema.safeParse({
        amount: '1,12345678',
        sellerPublicKey: validSellerPublicKey,
      }).success,
    ).toBe(false);
  });

  it('accepts amount at max ceiling (1000000000)', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 1000000000,
      sellerPublicKey: validSellerPublicKey,
    });

    expect(result.success).toBe(true);
  });

  it('accepts description at 500 chars and rejects 501', () => {
    const validResult = createInvoiceSchema.safeParse({
      amount: 10,
      description: 'a'.repeat(500),
      sellerPublicKey: validSellerPublicKey,
    });

    expect(validResult.success).toBe(true);

    const invalidResult = createInvoiceSchema.safeParse({
      amount: 10,
      description: 'a'.repeat(501),
      sellerPublicKey: validSellerPublicKey,
    });

    expect(invalidResult.success).toBe(false);
    if (invalidResult.success) {
      throw new Error('Expected description length 501 to fail validation');
    }
    expect(
      invalidResult.error.issues.some((issue) => issue.path.includes('description')),
    ).toBe(true);
  });

  it('accepts customerName at 255 chars and rejects 256', () => {
    const validResult = createInvoiceSchema.safeParse({
      amount: 10,
      customerName: 'a'.repeat(255),
      sellerPublicKey: validSellerPublicKey,
    });

    expect(validResult.success).toBe(true);

    const invalidResult = createInvoiceSchema.safeParse({
      amount: 10,
      customerName: 'a'.repeat(256),
      sellerPublicKey: validSellerPublicKey,
    });

    expect(invalidResult.success).toBe(false);
    if (invalidResult.success) {
      throw new Error('Expected customerName length 256 to fail validation');
    }
    expect(
      invalidResult.error.issues.some((issue) => issue.path.includes('customerName')),
    ).toBe(true);
  });

  it('accepts sellerName at 80 chars and rejects 81', () => {
    const validResult = createInvoiceSchema.safeParse({
      amount: 10,
      sellerName: 'a'.repeat(80),
      sellerPublicKey: validSellerPublicKey,
    });

    expect(validResult.success).toBe(true);

    const invalidResult = createInvoiceSchema.safeParse({
      amount: 10,
      sellerName: 'a'.repeat(81),
      sellerPublicKey: validSellerPublicKey,
    });

    expect(invalidResult.success).toBe(false);
    if (invalidResult.success) {
      throw new Error('Expected sellerName length 81 to fail validation');
    }
    expect(
      invalidResult.error.issues.some((issue) => issue.path.includes('sellerName')),
    ).toBe(true);
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
