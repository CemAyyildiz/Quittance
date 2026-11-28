/**
 * Regression tests for money comparisons: amounts are compared as integer
 * stroops, never after a floating-point / toFixed(7) round trip.
 */
import { describe, it, expect } from 'vitest';

import {
  amountToStroops,
  amountsMatch,
  isValidAmount,
  MAX_STROOPS,
  STROOPS_PER_UNIT,
} from './amount-compare';
import { verifyInvoicePayment } from './verify-invoice-payment';
import { VerifyErrorCode } from './verify-errors';
import { createInvoiceSchema } from './validation';

const seller = 'G' + 'A'.repeat(55);

describe('amountToStroops', () => {
  it('converts whole units and fractions exactly', () => {
    expect(amountToStroops('1.5')).toBe(15_000_000n);
    expect(amountToStroops('1.5000000')).toBe(15_000_000n);
    expect(amountToStroops('0.0000001')).toBe(1n);
    expect(amountToStroops(1.5)).toBe(15_000_000n);
    expect(STROOPS_PER_UNIT).toBe(10_000_000n);
  });

  it('rejects negative amounts', () => {
    expect(() => amountToStroops('-1')).toThrow();
    expect(() => amountToStroops(-0.0000001)).toThrow();
    expect(isValidAmount('-1')).toBe(false);
  });

  it('rejects more than seven decimal places', () => {
    expect(() => amountToStroops('1.00000001')).toThrow(/7 decimal/);
    expect(isValidAmount('1.00000001')).toBe(false);
  });

  it('rejects amounts above the signed int64 stroop ceiling', () => {
    expect(MAX_STROOPS).toBe(9_223_372_036_854_775_807n);
    expect(() => amountToStroops('922337203685.4775808')).toThrow();
  });
});

describe('amountsMatch', () => {
  it('treats equal stroop amounts as a match regardless of trailing zeros', () => {
    expect(amountsMatch('1.5000000', '1.5')).toBe(true);
    expect(amountsMatch('1.5', 1.5)).toBe(true);
    expect(amountsMatch('0.1000000', '0.1')).toBe(true);
  });

  it('does not match amounts one stroop apart', () => {
    expect(amountsMatch('1.0000000', '1.0000001')).toBe(false);
    expect(amountsMatch('1.0000000', '0.9999999')).toBe(false);
    expect(amountsMatch('0.0000002', '0.0000001')).toBe(false);
  });
});

describe('verify uses integer stroops', () => {
  const input = {
    txMemo: 'INV-1',
    invoiceMemo: 'INV-1',
    paymentTo: seller,
    invoiceSellerPublicKey: seller,
    paymentAmount: '1.5000000',
    invoiceAmount: 1.5,
    paymentAsset: 'XLM',
    invoiceAssetCode: 'XLM',
  };

  it('accepts the same amount written with different precision', () => {
    expect(verifyInvoicePayment(input)).toEqual({ ok: true });
  });

  it('accepts a valid partial payment one stroop short', () => {
    expect(verifyInvoicePayment({ ...input, paymentAmount: '1.4999999' })).toEqual({
      ok: true,
    });
  });

  it('rejects a payment one stroop over', () => {
    expect(verifyInvoicePayment({ ...input, paymentAmount: '1.5000001' })).toEqual({
      ok: false,
      code: VerifyErrorCode.AMOUNT_MISMATCH,
    });
  });
});

describe('create validation uses the same stroop helper', () => {
  it('rejects more than seven decimal places at create time', () => {
    const result = createInvoiceSchema.safeParse({ amount: 1.00000001, sellerPublicKey: seller });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('amount'))).toBe(true);
    }
  });

  it('accepts an amount at exactly seven decimal places', () => {
    expect(createInvoiceSchema.safeParse({ amount: 1.0000001, sellerPublicKey: seller }).success).toBe(
      true,
    );
  });
});
