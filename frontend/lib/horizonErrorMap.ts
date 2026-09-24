/**
 * horizonErrorMap
 *
 * Maps common Horizon (Stellar API) error codes to short, human-readable
 * English messages so the UI can show something clearer than a raw
 * `result_code` string.
 *
 * This is a **pure, additive helper**. It is intentionally not wired into the
 * pay or export hot paths — callers opt in by passing a code (or a raw Horizon
 * error object) and rendering the returned message however they like.
 *
 * Horizon reports failures in two overlapping shapes:
 *
 * 1. Transaction-level result codes, e.g. `tx_failed`, `tx_bad_seq`.
 * 2. Operation-level result codes, e.g. `op_underfunded`, `op_no_trust`,
 *    nested under `extras.result_codes.operations`.
 *
 * We cover the codes that a freelancer-invoicing flow realistically hits.
 * Unknown codes fall back to a safe generic message instead of throwing.
 */

/** A resolved, user-facing error message. */
export interface HorizonErrorMessage {
  /** The normalized code we matched on (e.g. `op_underfunded`). */
  code: string;
  /** Short English sentence safe to show to an end user. */
  message: string;
  /** Whether this code was recognized (`false` means the fallback was used). */
  known: boolean;
}

/**
 * Known Horizon result codes → English messages.
 *
 * Keep entries short and non-technical; the code itself is preserved on the
 * returned object for anyone who wants to log the raw value.
 */
const HORIZON_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  // --- Transaction-level result codes ---------------------------------
  tx_failed: 'The transaction failed. One or more of its operations did not succeed.',
  tx_too_early: 'The transaction was submitted too early. Please try again shortly.',
  tx_too_late: 'The transaction expired before it could be processed. Please retry.',
  tx_missing_operation: 'The transaction had no operations to process.',
  tx_bad_seq: 'The transaction sequence number was out of date. Please refresh and retry.',
  tx_bad_auth: 'The transaction was not signed by the required account.',
  tx_insufficient_balance: 'The account balance is too low to cover this transaction and its fee.',
  tx_no_source_account: 'The source account does not exist on the network yet.',
  tx_insufficient_fee: 'The offered fee was too low. Please retry with a higher fee.',
  tx_bad_auth_extra: 'The transaction carried more signatures than it needed.',
  tx_internal_error: 'Horizon reported an internal error. Please try again later.',

  // --- Operation-level result codes -----------------------------------
  op_underfunded: 'The sending account does not have enough balance for this payment.',
  op_no_trust: 'The destination account has no trustline for this asset.',
  op_no_destination: 'The destination account does not exist on the network.',
  op_line_full: 'The destination cannot receive this amount; its balance limit would be exceeded.',
  op_not_authorized: 'The account is not authorized to hold or send this asset.',
  op_low_reserve: 'The account would drop below the minimum reserve required by the network.',
  op_malformed: 'The payment was malformed. Please check the address, asset, and amount.',

  // --- HTTP-style Horizon conditions ----------------------------------
  not_found: 'The requested resource was not found on Horizon.',
  rate_limit_exceeded: 'Too many requests were sent to Horizon. Please slow down and retry.',
  timeout: 'The request to Horizon timed out. Please try again.',
  bad_request: 'Horizon rejected the request as malformed.',
  server_error: 'Horizon is currently unavailable. Please try again later.',
};

/** Message used when a code is missing or not recognized. */
const FALLBACK_MESSAGE = 'An unknown Horizon error occurred. Please try again.';

/** Code reported when the caller provides no usable input. */
const UNKNOWN_CODE = 'unknown';

/**
 * Normalize an incoming code to the lookup form: trimmed and lower-cased.
 * Returns an empty string for anything that is not a non-empty string.
 */
function normalizeCode(code: unknown): string {
  if (typeof code !== 'string') return '';
  return code.trim().toLowerCase();
}

/**
 * Resolve a Horizon error code to an English message.
 *
 * Accepts the raw code string (case-insensitive, surrounding whitespace
 * tolerated). Invalid input — `null`, `undefined`, non-strings, or an empty
 * string — resolves to the generic fallback message and `known: false`.
 *
 * @example
 * mapHorizonError('op_underfunded').message
 * // "The sending account does not have enough balance for this payment."
 *
 * @example
 * mapHorizonError('  TX_BAD_SEQ ').code // "tx_bad_seq"
 *
 * @example
 * mapHorizonError(undefined).known // false
 */
export function mapHorizonError(code: unknown): HorizonErrorMessage {
  const normalized = normalizeCode(code);

  if (normalized === '') {
    return { code: UNKNOWN_CODE, message: FALLBACK_MESSAGE, known: false };
  }

  const message = HORIZON_ERROR_MESSAGES[normalized];
  if (message === undefined) {
    return { code: normalized, message: FALLBACK_MESSAGE, known: false };
  }

  return { code: normalized, message, known: true };
}

/**
 * Convenience wrapper that returns just the English message string.
 * Useful for callers that only need text and do not care whether the code
 * was recognized.
 *
 * @example
 * horizonErrorMessage('op_no_trust')
 * // "The destination account has no trustline for this asset."
 */
export function horizonErrorMessage(code: unknown): string {
  return mapHorizonError(code).message;
}

/**
 * Best-effort extraction of a Horizon result code from a raw error object,
 * such as the shape thrown by the Stellar SDK / axios.
 *
 * It looks, in order, at:
 * - `extras.result_codes.operations[0]` (first operation-level code),
 * - `extras.result_codes.transaction` (transaction-level code).
 *
 * Returns `null` when no code can be found, so the caller can decide whether
 * to fall back to a different message.
 *
 * @example
 * extractHorizonCode({ extras: { result_codes: { operations: ['op_no_trust'] } } })
 * // "op_no_trust"
 */
export function extractHorizonCode(error: unknown): string | null {
  if (error === null || typeof error !== 'object') return null;

  // Peel `response.data` (axios) if present, otherwise use the object itself.
  const candidate =
    (error as Record<string, unknown>).extras !== undefined
      ? (error as Record<string, unknown>)
      : ((error as { response?: { data?: unknown } }).response?.data ?? error);

  const extras = (candidate as { extras?: unknown }).extras;
  if (extras === null || typeof extras !== 'object') return null;

  const resultCodes = (extras as { result_codes?: unknown }).result_codes;
  if (resultCodes === null || typeof resultCodes !== 'object') return null;

  const operations = (resultCodes as { operations?: unknown }).operations;
  if (Array.isArray(operations)) {
    const first = operations.find(
      (op) => typeof op === 'string' && op.trim() !== '',
    );
    if (typeof first === 'string') return first;
  }

  const transaction = (resultCodes as { transaction?: unknown }).transaction;
  if (typeof transaction === 'string' && transaction.trim() !== '') {
    return transaction;
  }

  return null;
}

export default mapHorizonError;
