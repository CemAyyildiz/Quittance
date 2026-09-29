/**
 * verify-invoice-payment.ts
 *
 * Pure, HTTP-free matcher that decides whether a confirmed Stellar payment
 * operation satisfies the expectations encoded on an invoice.
 *
 * It intentionally performs only the four field comparisons that the MVP
 * verify handler runs inline (memo, destination, amount, asset) and returns a
 * discriminated result so callers can translate it into a response without
 * re-implementing the matching logic.
 *
 * Keeping this as a pure function means it can be unit-tested exhaustively
 * without spinning up Express, Stellar Horizon, or the in-memory store.
 */

import { isDecimalEqual } from './amount-compare';
import { memosMatch } from './memo-normalize';
import { NATIVE_ASSET_CODE } from './asset-helpers';
import { VerifyErrorCode } from './verify-errors';

/**
 * Normalised inputs for a single payment-to-invoice verification.
 *
 * `paymentAsset` must already be resolved to the same representation used for
 * `invoiceAssetCode` (e.g. `'XLM'` for a native payment, otherwise the
 * asset code). `invoiceAmount` accepts a number or string so the matcher
 * works whether the invoice stores a JS `number` or a serialised decimal.
 */
export interface VerifyInvoicePaymentInput {
  /** Transaction memo (`transaction.memo`). */
  txMemo: string | null | undefined;
  /** Invoice memo (`invoice.memo`). */
  invoiceMemo: string | null | undefined;
  /** Payment destination address (`paymentOp.to`). */
  paymentTo: string;
  /** Invoice seller public key (`invoice.sellerPublicKey`). */
  invoiceSellerPublicKey: string;
  /** Payment amount as a decimal string (`paymentOp.amount`). */
  paymentAmount: string;
  /** Invoice amount (`invoice.amount`). */
  invoiceAmount: number | string;
  /** Resolved payment asset (`'XLM'` for native, else the asset code). */
  paymentAsset: string;
  /** Invoice asset code (`invoice.assetCode`). */
  invoiceAssetCode: string;
  /**
   * Payment asset issuer (`paymentOp.asset_issuer`). Absent for native
   * lumens, which have no issuer.
   */
  paymentAssetIssuer?: string | null;
  /**
   * Invoice asset issuer (`invoice.assetIssuer`). Absent for `XLM`.
   */
  invoiceAssetIssuer?: string | null;
  /**
   * Whether Horizon reported the payment as native
   * (`paymentOp.asset_type === 'native'`).
   *
   * Optional so existing callers keep their behaviour; when supplied, an `XLM`
   * invoice additionally requires the payment to really be native. Nothing
   * stops anyone issuing a *credit* asset whose code is the three characters
   * `XLM`, and such a payment carries `asset_code: 'XLM'` just like the real
   * thing.
   */
  paymentIsNative?: boolean;
}

/**
 * Success result: every field matched.
 */
export interface VerifyInvoicePaymentOk {
  ok: true;
}

/**
 * Failure result: the first mismatching field, expressed as a stable
 * [`VerifyErrorCode`].
 */
export interface VerifyInvoicePaymentFail {
  ok: false;
  code: VerifyErrorCode;
}

export type VerifyInvoicePaymentResult =
  | VerifyInvoicePaymentOk
  | VerifyInvoicePaymentFail;

/** Trimmed issuer, or `undefined` when none was recorded. */
function normalizeIssuer(issuer: string | null | undefined): string | undefined {
  const trimmed = (issuer ?? '').trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Whether a payment's asset settles an invoice's asset.
 *
 * A Stellar asset is identified by the pair `(code, issuer)`, never by the code
 * alone: `docs/ASSETS.md` requires USDC invoices to name both. Comparing codes
 * alone lets any token that happens to be called `USDC` settle a USDC invoice,
 * which on testnet is anyone at all.
 *
 * The rules, in order:
 *
 * 1. An `XLM` invoice is settled only by a genuinely native payment. When the
 *    caller reports `paymentIsNative`, that is what decides — not the code.
 * 2. Codes must match.
 * 3. For a credit asset, issuers must match. This **fails closed**: an invoice
 *    that records no issuer cannot be settled at all, rather than being
 *    settleable by any token sharing its code. An asset nobody pinned is not
 *    an asset anyone agreed to accept.
 *
 * Exported so the MVP verify handler applies exactly these rules rather than
 * a second copy of them.
 */
export function paymentAssetMatchesInvoice(input: {
  paymentAsset: string;
  invoiceAssetCode: string;
  paymentAssetIssuer?: string | null;
  invoiceAssetIssuer?: string | null;
  paymentIsNative?: boolean;
}): boolean {
  const invoiceIsNative = input.invoiceAssetCode === NATIVE_ASSET_CODE;

  if (invoiceIsNative) {
    // `paymentIsNative` is only consulted when the caller supplied it, so
    // callers that predate this check keep their previous behaviour.
    if (input.paymentIsNative === false) {
      return false;
    }
    return input.paymentAsset === NATIVE_ASSET_CODE;
  }

  if (input.paymentIsNative === true) {
    return false;
  }

  if (input.paymentAsset !== input.invoiceAssetCode) {
    return false;
  }

  const invoiceIssuer = normalizeIssuer(input.invoiceAssetIssuer);
  const paymentIssuer = normalizeIssuer(input.paymentAssetIssuer);

  if (invoiceIssuer === undefined || paymentIssuer === undefined) {
    return false;
  }

  return invoiceIssuer === paymentIssuer;
}

/**
 * Verify that a Stellar payment operation matches the invoice it claims to
 * settle.
 *
 * Checks run in the same order as the MVP `verify` handler so the reported
 * `code` matches what that handler would have returned: memo, destination,
 * amount, then asset. The first mismatch short-circuits and wins.
 *
 * @example
 * verifyInvoicePayment({
 *   txMemo: 'INV-1',
 *   invoiceMemo: 'INV-1',
 *   paymentTo: 'GSELLER',
 *   invoiceSellerPublicKey: 'GSELLER',
 *   paymentAmount: '1.5000000',
 *   invoiceAmount: 1.5,
 *   paymentAsset: 'XLM',
 *   invoiceAssetCode: 'XLM',
 * })
 * // => { ok: true }
 */
export function verifyInvoicePayment(
  input: VerifyInvoicePaymentInput,
): VerifyInvoicePaymentResult {
  if (!memosMatch(input.txMemo, input.invoiceMemo)) {
    return { ok: false, code: VerifyErrorCode.MEMO_MISMATCH };
  }

  if (input.paymentTo !== input.invoiceSellerPublicKey) {
    return { ok: false, code: VerifyErrorCode.DESTINATION_MISMATCH };
  }

  if (!isDecimalEqual(input.paymentAmount, String(input.invoiceAmount))) {
    return { ok: false, code: VerifyErrorCode.AMOUNT_MISMATCH };
  }

  if (!paymentAssetMatchesInvoice(input)) {
    return { ok: false, code: VerifyErrorCode.ASSET_MISMATCH };
  }

  return { ok: true };
}

export default verifyInvoicePayment;
