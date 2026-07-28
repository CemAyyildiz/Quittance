import { describe, it, expect } from 'vitest';
import {
  VerifyErrorCode,
  VerifyErrorMessages,
  isVerifyErrorCode,
  verifyErrorMessage,
} from '../verify-errors';

describe('VerifyErrorCode', () => {
  it('contains the legacy controller string codes', () => {
    // These five strings are exactly the `error` field values
    // currently returned from `controllers/invoice.controller.ts`
    // `verifyPayment`. If any of them drifts, downstream consumers
    // will silently mismatch — keep this test green.
    expect(VerifyErrorCode.TX_HASH_REQUIRED).toBe('TX_HASH_REQUIRED');
    expect(VerifyErrorCode.INVOICE_NOT_FOUND).toBe('INVOICE_NOT_FOUND');
    expect(VerifyErrorCode.NO_PAYMENT_OPERATION).toBe('NO_PAYMENT_OPERATION');
    expect(VerifyErrorCode.MEMO_MISMATCH).toBe('MEMO_MISMATCH');
    expect(VerifyErrorCode.AMOUNT_MISMATCH).toBe('AMOUNT_MISMATCH');
  });

  it('includes the future-proof full-server codes', () => {
    expect(VerifyErrorCode.DESTINATION_MISMATCH).toBe('DESTINATION_MISMATCH');
    expect(VerifyErrorCode.ASSET_MISMATCH).toBe('ASSET_MISMATCH');
    expect(VerifyErrorCode.INVOICE_ALREADY_PAID).toBe('INVOICE_ALREADY_PAID');
    expect(VerifyErrorCode.INVOICE_EXPIRED).toBe('INVOICE_EXPIRED');
    expect(VerifyErrorCode.VERIFY_FAILED).toBe('VERIFY_FAILED');
  });

  it('string codes are unique across the enum', () => {
    const values = Object.values(VerifyErrorCode);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('every enum variant has a non-empty message', () => {
    for (const code of Object.values(VerifyErrorCode)) {
      const msg = VerifyErrorMessages[code];
      expect(typeof msg).toBe('string');
      expect(msg.trim().length).toBeGreaterThan(0);
    }
  });

  it('VerifyErrorMessages is frozen', () => {
    expect(Object.isFrozen(VerifyErrorMessages)).toBe(true);
  });

  it('Record<VerifyErrorCode, string> covers the whole enum', () => {
    // Belt-and-braces: if the enum ever gains a variant without a
    // matching message key, `Object.keys(VerifyErrorMessages).length`
    // will fall behind `Object.values(VerifyErrorCode).length` and
    // this test will fail.
    const enumCount = Object.values(VerifyErrorCode).length;
    const messageKeys = Object.keys(VerifyErrorMessages);
    expect(messageKeys.length).toBe(enumCount);
  });

  it('verifyErrorMessage helper returns the same string as the lookup', () => {
    for (const code of Object.values(VerifyErrorCode)) {
      expect(verifyErrorMessage(code)).toBe(VerifyErrorMessages[code]);
    }
  });

  it('legacy controller strings round-trip through the helper', () => {
    // The MVP controller's `verifyPayment` currently emits these
    // exact strings. They must remain equal to the message map so a
    // future refactor that swaps ad-hoc strings for the enum values
    // produces no behavior change at the HTTP boundary.
    expect(verifyErrorMessage(VerifyErrorCode.TX_HASH_REQUIRED)).toBe(
      'Transaction hash is required',
    );
    expect(verifyErrorMessage(VerifyErrorCode.INVOICE_NOT_FOUND)).toBe('Invoice not found');
    expect(verifyErrorMessage(VerifyErrorCode.NO_PAYMENT_OPERATION)).toBe(
      'No payment operation found',
    );
    expect(verifyErrorMessage(VerifyErrorCode.MEMO_MISMATCH)).toBe('Memo mismatch');
    expect(verifyErrorMessage(VerifyErrorCode.AMOUNT_MISMATCH)).toBe('Amount mismatch');
    expect(verifyErrorMessage(VerifyErrorCode.VERIFY_FAILED)).toBe(
      'Failed to verify payment',
    );
  });
});

describe('isVerifyErrorCode', () => {
  it('accepts every enum value', () => {
    for (const code of Object.values(VerifyErrorCode)) {
      expect(isVerifyErrorCode(code)).toBe(true);
    }
  });

  it('rejects unrelated strings', () => {
    expect(isVerifyErrorCode('something_else')).toBe(false);
    expect(isVerifyErrorCode('memo_mismatch_lowercase')).toBe(false);
    expect(isVerifyErrorCode('')).toBe(false);
  });

  it('rejects non-string inputs', () => {
    expect(isVerifyErrorCode(undefined)).toBe(false);
    expect(isVerifyErrorCode(null)).toBe(false);
    expect(isVerifyErrorCode(42)).toBe(false);
    expect(isVerifyErrorCode({})).toBe(false);
    expect(isVerifyErrorCode([])).toBe(false);
  });
});
