/**
 * Stable English codes for /verify endpoint failures.
 *
 * The Quittance MVP `POST /api/invoices/:id/verify` handler currently
 * surfaces five ad-hoc English error strings (see
 * `controllers/invoice.controller.ts` `verifyPayment`). Each of those
 * strings maps 1:1 to a member of [`VerifyErrorCode`] below. The full
 * Soroban-server variant will need additional codes (destination
 * match, asset match, payment-not-confirmed, invoice-already-paid,
 * invoice-expired) — those are also exported here so the consuming
 * code can pull from a single namespace without having to revisit
 * this file when those checks land.
 *
 * # Status codes are part of the public API
 *
 * Off-chain indexers, dashboards, and the frontend rely on these
 * string codes as a stable wire format. Renaming or removing a code
 * is a breaking change. Adding a new code is non-breaking.
 *
 * # Why a string enum and not numeric codes?
 *
 * - TypeScript numeric enums produce tiny code values that lose
 *   meaning in network logs without a registry. Strings are
 *   self-describing in JSON, Auth0-style log lines, and Error objects.
 * - The accompanying Soroban contract `contracts/error_codes` uses
 *   numeric `u32` codes because the on-chain wire format is small and
 *   fixed-width there. Off-chain TS code does not have that
 *   constraint, so we privilege readability.
 *
 * # Scope (intentionally bounded)
 *
 * - Pure data: an enum, a frozen message map, and three small helper
 *   predicates.
 * - The MVP verify handler uses these values directly in its response
 *   body so clients can branch on codes without parsing English text.
 */

export enum VerifyErrorCode {
  /** Caller did not supply a `txHash`. */
  TX_HASH_REQUIRED = 'TX_HASH_REQUIRED',
  /** Invoice id in the URL did not match any invoice on record. */
  INVOICE_NOT_FOUND = 'INVOICE_NOT_FOUND',
  /** The matched transaction contained no payment operation. */
  NO_PAYMENT_OPERATION = 'NO_PAYMENT_OPERATION',
  /** The transaction memo does not match the invoice memo. */
  MEMO_MISMATCH = 'MEMO_MISMATCH',
  /** The transferred amount does not match the invoice amount. */
  AMOUNT_MISMATCH = 'AMOUNT_MISMATCH',
  /**
   * The payment destination does not match the invoice seller.
   * Reserved for the full-server payment-verification path; not
   * currently raised from the MVP server.
   */
  DESTINATION_MISMATCH = 'DESTINATION_MISMATCH',
  /**
   * The payment asset does not match the invoice asset.
   * Reserved for the full-server payment-verification path.
   */
  ASSET_MISMATCH = 'ASSET_MISMATCH',
  /**
   * The invoice has already been marked paid in our records.
   * Reserved for the full-server payment-verification path.
   */
  INVOICE_ALREADY_PAID = 'INVOICE_ALREADY_PAID',
  /**
   * The invoice status is not PENDING (e.g. CANCELLED, DRAFT, or
   * expired). Raised as a separate code from INVOICE_ALREADY_PAID
   * so the consumer can distinguish duplicate payments from
   * invoices that cannot be settled at all.
   */
  INVOICE_NOT_PENDING = 'INVOICE_NOT_PENDING',
  /**
   * The invoice settlement window has expired.
   * Reserved for the full-server payment-verification path.
   */
  INVOICE_EXPIRED = 'INVOICE_EXPIRED',
  /**
   * Catch-all for Horizon / network / unexpected-derive failures
   * that the MVP collapses into a single generic error. Replace
   * with finer-grained codes as the verify path matures.
   */
  VERIFY_FAILED = 'VERIFY_FAILED',
}

/**
 * Stable English messages for every [`VerifyErrorCode`] variant.
 *
 * The object is frozen and the record key type is `VerifyErrorCode`,
 * so any future addition to the enum **must** also add a key here or
 * TypeScript's `Record<VerifyErrorCode, string>` will fail to compile.
 * This is intentional: the type system exists to prevent a code from
 * being shipped without a message.
 */
export const VerifyErrorMessages: Readonly<Record<VerifyErrorCode, string>> = Object.freeze({
  [VerifyErrorCode.TX_HASH_REQUIRED]: 'Transaction hash is required',
  [VerifyErrorCode.INVOICE_NOT_FOUND]: 'Invoice not found',
  [VerifyErrorCode.NO_PAYMENT_OPERATION]: 'No payment operation found',
  [VerifyErrorCode.MEMO_MISMATCH]: 'Memo mismatch',
  [VerifyErrorCode.AMOUNT_MISMATCH]: 'Amount mismatch',
  [VerifyErrorCode.DESTINATION_MISMATCH]:
    'Payment destination does not match the invoice seller.',
  [VerifyErrorCode.ASSET_MISMATCH]: 'Payment asset does not match the invoice asset.',
  [VerifyErrorCode.INVOICE_ALREADY_PAID]: 'Invoice has already been paid.',
  [VerifyErrorCode.INVOICE_NOT_PENDING]: 'Invoice is not pending',
  [VerifyErrorCode.INVOICE_EXPIRED]: 'Invoice settlement window has expired.',
  [VerifyErrorCode.VERIFY_FAILED]: 'Failed to verify payment',
});

/**
 * Look up the stable English message for a [`VerifyErrorCode`].
 *
 * Switching on the message string directly would couple consumers to
 * the human-readable copy — using this helper means a future
 * copy-edit to the lookup table does not silently break consumers
 * that are branching on `error.message`.
 */
export function verifyErrorMessage(code: VerifyErrorCode): string {
  return VerifyErrorMessages[code];
}

/**
 * Returns `true` if `value` is a valid [`VerifyErrorCode`] string.
 *
 * Useful for validating values coming back from a JSON payload, a
 * persisted log line, or a query parameter before using them as a
 * key into [`VerifyErrorMessages`].
 */
export function isVerifyErrorCode(value: unknown): value is VerifyErrorCode {
  if (typeof value !== 'string') {
    return false;
  }
  return (Object.values(VerifyErrorCode) as string[]).includes(value);
}

export default {
  VerifyErrorCode,
  VerifyErrorMessages,
  verifyErrorMessage,
  isVerifyErrorCode,
};
