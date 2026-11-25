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

import { compareDecimals } from './amount-compare';
import { memosMatch } from './memo-normalize';
import { NATIVE_ASSET_CODE, normalizeAssetCode } from './asset-helpers';
import { VerifyErrorCode } from './verify-errors';
import { extractBaseAddress, MuxedAccount, StrKey } from '@stellar/stellar-sdk';

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
  /** Horizon's muxed destination fields, when the payment targets an M address. */
  paymentToMuxed?: string | null;
  paymentToMuxedId?: string | number | null;
  /** Invoice seller public key (`invoice.sellerPublicKey`). */
  invoiceSellerPublicKey: string;
  invoiceSellerMuxedAddress?: string | null;
  /**
   * Account that sent the payment (`paymentOp.from`, i.e. the transaction or
   * operation source). When it is the seller, the payment is a self-payment
   * and cannot settle the invoice.
   *
   * Optional so callers that cannot supply a source keep their previous
   * behaviour.
   */
  paymentSource?: string | null;
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
 * Whether the payment was sent by the seller themselves.
 *
 * Horizon reports the *inner* transaction source for a fee-bump receipt, so a
 * fee-bumped self-payment still arrives here with the seller as the source.
 */
export function isSelfPayment(
  paymentSource: string | null | undefined,
  invoiceSellerPublicKey: string,
): boolean {
  const source = (paymentSource ?? '').trim();
  const seller = (invoiceSellerPublicKey ?? '').trim();
  return source !== '' && seller !== '' && source === seller;
}

/** Match the base account and, when Horizon reports one, the exact muxed id. */
export function paymentDestinationMatchesInvoice(input: Pick<VerifyInvoicePaymentInput,
  'paymentTo' | 'paymentToMuxed' | 'paymentToMuxedId' | 'invoiceSellerPublicKey' | 'invoiceSellerMuxedAddress'
>): boolean {
  const toIsMuxed = StrKey.isValidMed25519PublicKey(input.paymentTo);
  const paymentBase = toIsMuxed ? extractBaseAddress(input.paymentTo) : input.paymentTo;
  if (paymentBase !== input.invoiceSellerPublicKey) return false;

  const muxedAddress = input.paymentToMuxed ?? (toIsMuxed ? input.paymentTo : undefined);
  const expected = input.invoiceSellerMuxedAddress;
  if (toIsMuxed && input.paymentTo !== expected) return false;
  if (muxedAddress && muxedAddress !== expected) return false;
  if (input.paymentToMuxedId !== undefined && input.paymentToMuxedId !== null) {
    if (!expected || String(input.paymentToMuxedId) !== MuxedAccount.fromAddress(expected, '0').id()) {
      return false;
    }
  }
  return true;
}

/**
 * Minimal shape of a Horizon transaction needed to recognise a fee bump.
 *
 * Horizon populates `inner_transaction` only for fee-bump transactions; a
 * regular transaction's `fee_account` is its own source, so `fee_account`
 * alone is not enough to tell the forms apart.
 */
export interface FeeBumpTransactionShape {
  inner_transaction?: unknown;
  memo?: string | null;
}

/** Whether Horizon returned the fee-bump form of a transaction. */
export function isFeeBumpTransaction(
  transaction: FeeBumpTransactionShape | null | undefined,
): boolean {
  return Boolean(transaction?.inner_transaction);
}

/**
 * A fee bump wraps an inner transaction, never another fee bump. Detect the
 * nested shape (which the network would reject) before trusting its contents.
 */
export function isNestedFeeBump(
  transaction: FeeBumpTransactionShape | null | undefined,
): boolean {
  const inner = transaction?.inner_transaction as FeeBumpTransactionShape | null | undefined;
  return Boolean(inner && (inner.inner_transaction || (inner as any).fee_account));
}

/**
 * A fee-bump for an invoice must wrap exactly the invoice payment: one payment
 * operation and nothing else (no create-account, change-trust, etc.).
 */
export function feeBumpWrapsOnlyPayment(
  operations: Array<{ type?: string }> | null | undefined,
): boolean {
  return Boolean(operations && operations.length === 1 && operations[0]?.type === 'payment');
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
  const paymentAsset = normalizeAssetCode(input.paymentAsset);
  const invoiceAssetCode = normalizeAssetCode(input.invoiceAssetCode);

  // An `XLM` invoice that records an issuer is a *credit* asset that happens
  // to share the native code, not native lumens; only an issuer-less XLM
  // invoice is native.
  const invoiceIsNative =
    invoiceAssetCode === NATIVE_ASSET_CODE &&
    normalizeIssuer(input.invoiceAssetIssuer) === undefined;

  if (invoiceIsNative) {
    // `paymentIsNative` is only consulted when the caller supplied it, so
    // callers that predate this check keep their previous behaviour.
    if (input.paymentIsNative === false) {
      return false;
    }
    return paymentAsset === NATIVE_ASSET_CODE;
  }

  if (input.paymentIsNative === true) {
    return false;
  }

  if (paymentAsset !== invoiceAssetCode) {
    return false;
  }

  const invoiceIssuer = normalizeIssuer(input.invoiceAssetIssuer);
  const paymentIssuer = normalizeIssuer(input.paymentAssetIssuer);

  if (invoiceIssuer === undefined || paymentIssuer === undefined) {
    return false;
  }

  return invoiceIssuer === paymentIssuer;
}

/** Horizon transaction fields that carry the time bounds and ledger time. */
export interface HorizonTimeBoundsSource {
  created_at?: string | null;
  valid_before?: string | null;
  preconditions?: { timebounds?: { max_time?: string | number | null } | null } | null;
}

/** Unix seconds of a date-like value, or `undefined` when unparseable. */
function toUnixSeconds(value: Date | string | number | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : undefined;
}

/**
 * The transaction max time in unix seconds, or `undefined` when unbounded.
 *
 * Current Horizon reports `preconditions.timebounds.max_time` (unix seconds,
 * `"0"` meaning no bound); older Horizon only reports `valid_before` (ISO).
 */
export function getTransactionMaxTime(tx: HorizonTimeBoundsSource): number | undefined {
  const raw = tx.preconditions?.timebounds?.max_time;
  if (raw !== undefined && raw !== null) {
    const seconds = Number(raw);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
  }
  return toUnixSeconds(tx.valid_before);
}

/**
 * Whether a confirmed transaction respects the invoice expiry.
 *
 * Judged on ledger close time rather than request arrival, so a payment that
 * was signed and held cannot settle an invoice after it expired. Seconds are
 * compared, and `ledgerTime == expiry` is still accepted. A transaction with
 * no max time, or without a readable ledger time, is rejected.
 */
export function checkTransactionTimeBounds(input: {
  invoiceExpiresAt: Date | string;
  tx: HorizonTimeBoundsSource;
}): VerifyInvoicePaymentResult {
  const expiry = toUnixSeconds(input.invoiceExpiresAt);
  if (expiry === undefined) {
    return { ok: true };
  }

  const ledgerTime = toUnixSeconds(input.tx.created_at);
  if (getTransactionMaxTime(input.tx) === undefined || ledgerTime === undefined) {
    return { ok: false, code: VerifyErrorCode.TX_TIME_BOUNDS_INVALID };
  }

  if (ledgerTime > expiry) {
    return { ok: false, code: VerifyErrorCode.INVOICE_EXPIRED };
  }

  return { ok: true };
}

/**
 * Verify that a Stellar payment operation matches the invoice it claims to
 * settle.
 *
 * Checks run in the same order as the MVP `verify` handler so the reported
 * `code` matches what that handler would have returned: self-payment, memo,
 * destination, amount, then asset. The first mismatch short-circuits and wins.
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
  if (isSelfPayment(input.paymentSource, input.invoiceSellerPublicKey)) {
    return { ok: false, code: VerifyErrorCode.SELF_PAYMENT };
  }

  if (!memosMatch(input.txMemo, input.invoiceMemo)) {
    return { ok: false, code: VerifyErrorCode.MEMO_MISMATCH };
  }

  if (!paymentDestinationMatchesInvoice(input)) {
    return { ok: false, code: VerifyErrorCode.DESTINATION_MISMATCH };
  }

  if (
    compareDecimals(input.paymentAmount, '0') <= 0 ||
    compareDecimals(input.paymentAmount, String(input.invoiceAmount)) > 0
  ) {
    return { ok: false, code: VerifyErrorCode.AMOUNT_MISMATCH };
  }

  if (!paymentAssetMatchesInvoice(input)) {
    return { ok: false, code: VerifyErrorCode.ASSET_MISMATCH };
  }

  return { ok: true };
}

export default verifyInvoicePayment;
