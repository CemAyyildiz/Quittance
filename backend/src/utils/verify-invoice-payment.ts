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

  if (input.paymentAsset !== input.invoiceAssetCode) {
    return { ok: false, code: VerifyErrorCode.ASSET_MISMATCH };
  }

  return { ok: true };
}

export default verifyInvoicePayment;
