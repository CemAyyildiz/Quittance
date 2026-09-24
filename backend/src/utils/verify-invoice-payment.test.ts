/**
 * verify-invoice-payment.test.ts
 *
 * Unit tests for the pure payment matcher. Each mismatch type is exercised
 * along with the success path; no HTTP/Express wiring is involved.
 */

import { describe, it, expect } from 'vitest';
import {
  paymentAssetMatchesInvoice,
  verifyInvoicePayment,
} from './verify-invoice-payment';
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

describe('asset identity: code plus issuer', () => {
  const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
  const OTHER_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

  /** A matching baseline for a credit-asset invoice. */
  function usdcInput(overrides: Record<string, unknown> = {}) {
    return {
      txMemo: 'INV-001',
      invoiceMemo: 'INV-001',
      paymentTo: 'GSELLER',
      invoiceSellerPublicKey: 'GSELLER',
      paymentAmount: '1.5000000',
      invoiceAmount: 1.5,
      paymentAsset: 'USDC',
      invoiceAssetCode: 'USDC',
      paymentAssetIssuer: USDC_ISSUER,
      invoiceAssetIssuer: USDC_ISSUER,
      paymentIsNative: false,
      ...overrides,
    };
  }

  it('accepts a native payment against an XLM invoice', () => {
    expect(verifyInvoicePayment(validInput())).toEqual({ ok: true });
  });

  it('accepts USDC when both code and issuer match', () => {
    expect(verifyInvoicePayment(usdcInput())).toEqual({ ok: true });
  });

  it('rejects USDC from a different issuer', () => {
    // The attack this closes: on testnet anyone can issue a token called USDC.
    expect(verifyInvoicePayment(usdcInput({ paymentAssetIssuer: OTHER_ISSUER }))).toEqual({
      ok: false,
      code: VerifyErrorCode.ASSET_MISMATCH,
    });
  });

  it('rejects a credit payment when the invoice pinned no issuer', () => {
    // Fails closed: an asset nobody pinned is not one anyone agreed to accept.
    expect(verifyInvoicePayment(usdcInput({ invoiceAssetIssuer: undefined }))).toEqual({
      ok: false,
      code: VerifyErrorCode.ASSET_MISMATCH,
    });
  });

  it('rejects a credit payment that carries no issuer', () => {
    expect(verifyInvoicePayment(usdcInput({ paymentAssetIssuer: null }))).toEqual({
      ok: false,
      code: VerifyErrorCode.ASSET_MISMATCH,
    });
  });

  it('rejects a payment whose code differs regardless of issuer', () => {
    expect(verifyInvoicePayment(usdcInput({ paymentAsset: 'EURC' }))).toEqual({
      ok: false,
      code: VerifyErrorCode.ASSET_MISMATCH,
    });
  });

  it('rejects a credit asset that merely calls itself XLM', () => {
    // Horizon reports asset_type credit_alphanum4 with asset_code "XLM"; the
    // code alone would have matched a native invoice.
    expect(
      verifyInvoicePayment({
        ...validInput(),
        paymentAsset: 'XLM',
        paymentAssetIssuer: OTHER_ISSUER,
        paymentIsNative: false,
      }),
    ).toEqual({ ok: false, code: VerifyErrorCode.ASSET_MISMATCH });
  });

  it('rejects a native payment against a credit invoice', () => {
    expect(verifyInvoicePayment(usdcInput({ paymentAsset: 'XLM', paymentIsNative: true }))).toEqual(
      { ok: false, code: VerifyErrorCode.ASSET_MISMATCH },
    );
  });

  it('leaves callers that do not report nativeness unchanged', () => {
    // Backwards compatibility: without `paymentIsNative`, an XLM invoice is
    // matched on code exactly as before.
    const { paymentIsNative: _ignored, ...withoutNativeFlag } = {
      ...validInput(),
      paymentIsNative: undefined,
    };
    expect(verifyInvoicePayment(withoutNativeFlag)).toEqual({ ok: true });
  });
});

describe('paymentAssetMatchesInvoice', () => {
  const ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

  it('treats surrounding whitespace on an issuer as the same issuer', () => {
    expect(
      paymentAssetMatchesInvoice({
        paymentAsset: 'USDC',
        invoiceAssetCode: 'USDC',
        paymentAssetIssuer: ` ${ISSUER} `,
        invoiceAssetIssuer: ISSUER,
        paymentIsNative: false,
      }),
    ).toBe(true);
  });

  it('treats an empty issuer string as no issuer at all', () => {
    expect(
      paymentAssetMatchesInvoice({
        paymentAsset: 'USDC',
        invoiceAssetCode: 'USDC',
        paymentAssetIssuer: '   ',
        invoiceAssetIssuer: ISSUER,
        paymentIsNative: false,
      }),
    ).toBe(false);
  });

  it('ignores the issuer entirely for a native pair', () => {
    expect(
      paymentAssetMatchesInvoice({
        paymentAsset: 'XLM',
        invoiceAssetCode: 'XLM',
        paymentIsNative: true,
      }),
    ).toBe(true);
  });
});
