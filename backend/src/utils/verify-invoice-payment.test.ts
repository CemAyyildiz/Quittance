/**
 * verify-invoice-payment.test.ts
 *
 * Unit tests for the pure payment matcher. Each mismatch type is exercised
 * along with the success path; no HTTP/Express wiring is involved.
 */

import { describe, it, expect } from 'vitest';
import { verifyInvoicePayment } from './verify-invoice-payment';
import { VerifyErrorCode } from './verify-errors';

/** A fully-matching baseline so individual fields can be mutated per case. */
function validInput() {
  return {
    txMemo: 'INV-001',
    invoiceMemo: 'INV-001',
    paymentTo: 'GSELLER',
    invoiceSellerPublicKey: 'GSELLER',
    paymentAmount: '1.5000000',
    invoiceAmount: 1.5,
    paymentAsset: 'XLM',
    invoiceAssetCode: 'XLM',
  };
}

describe('verifyInvoicePayment', () => {
  it('returns ok:true for a fully matching payment', () => {
    expect(verifyInvoicePayment(validInput())).toEqual({ ok: true });
  });

  describe('memo mismatch', () => {
    it('flags differing memos', () => {
      const result = verifyInvoicePayment({
        ...validInput(),
        txMemo: 'INV-002',
      });
      expect(result).toEqual({ ok: false, code: VerifyErrorCode.MEMO_MISMATCH });
    });

    it('treats empty/whitespace memos as equal (memosMatch semantics)', () => {
      expect(
        verifyInvoicePayment({ ...validInput(), txMemo: '  ', invoiceMemo: '' }),
      ).toEqual({ ok: true });
    });
  });

  describe('destination mismatch', () => {
    it('flags a wrong payment destination', () => {
      const result = verifyInvoicePayment({
        ...validInput(),
        paymentTo: 'GOTHER',
      });
      expect(result).toEqual({
        ok: false,
        code: VerifyErrorCode.DESTINATION_MISMATCH,
      });
    });
  });

  describe('amount mismatch', () => {
    it('flags genuinely different amounts', () => {
      const result = verifyInvoicePayment({
        ...validInput(),
        paymentAmount: '2.0',
        invoiceAmount: 1.5,
      });
      expect(result).toEqual({
        ok: false,
        code: VerifyErrorCode.AMOUNT_MISMATCH,
      });
    });

    it('matches trailing-zero differences (1.5 vs 1.5000000)', () => {
      expect(
        verifyInvoicePayment({
          ...validInput(),
          paymentAmount: '1.5000000',
          invoiceAmount: 1.5,
        }),
      ).toEqual({ ok: true });
    });

    it('matches a string invoice amount without float artefacts', () => {
      expect(
        verifyInvoicePayment({
          ...validInput(),
          paymentAmount: '1.5',
          invoiceAmount: '1.5',
        }),
      ).toEqual({ ok: true });
    });
  });

  describe('asset mismatch', () => {
    it('flags a different asset', () => {
      const result = verifyInvoicePayment({
        ...validInput(),
        paymentAsset: 'USDC',
      });
      expect(result).toEqual({ ok: false, code: VerifyErrorCode.ASSET_MISMATCH });
    });

    it('flags native vs non-native confusion', () => {
      const result = verifyInvoicePayment({
        ...validInput(),
        paymentAsset: 'XLM',
        invoiceAssetCode: 'USDC',
      });
      expect(result).toEqual({ ok: false, code: VerifyErrorCode.ASSET_MISMATCH });
    });
  });

  describe('check precedence', () => {
    it('reports memo before destination when both are wrong', () => {
      const result = verifyInvoicePayment({
        ...validInput(),
        txMemo: 'WRONG',
        paymentTo: 'GOTHER',
      });
      expect(result).toEqual({ ok: false, code: VerifyErrorCode.MEMO_MISMATCH });
    });

    it('reports destination before amount when both are wrong', () => {
      const result = verifyInvoicePayment({
        ...validInput(),
        paymentTo: 'GOTHER',
        paymentAmount: '999',
        invoiceAmount: 1.5,
      });
      expect(result).toEqual({
        ok: false,
        code: VerifyErrorCode.DESTINATION_MISMATCH,
      });
    });

    it('reports amount before asset when both are wrong', () => {
      const result = verifyInvoicePayment({
        ...validInput(),
        paymentAmount: '999',
        invoiceAmount: 1.5,
        paymentAsset: 'USDC',
      });
      expect(result).toEqual({ ok: false, code: VerifyErrorCode.AMOUNT_MISMATCH });
    });
  });
});
