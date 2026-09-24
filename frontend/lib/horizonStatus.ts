/**
 * horizonStatus — Map Stellar Horizon failure shapes to English user-facing messages.
 *
 * Handles HTTP status codes, transaction result codes, and operation result codes
 * commonly returned by Horizon. The input can be any error shape (Axios, Horizon
 * SDK, fetch, or a plain string), and the output is always a readable string
 * suitable for toast notifications, inline errors, or log summaries.
 *
 * When no known pattern is matched the raw error message (or a generic fallback)
 * is returned so the caller always has *something* to show.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Broadest possible error shape — everything is optional / loose. */
export interface HorizonErrorLike {
  message?: string;
  status?: number;
  response?: {
    status?: number;
    data?: {
      title?: string;
      detail?: string;
      extras?: {
        result_codes?: {
          transaction?: string;
          operations?: string[];
        };
      };
    };
  };
  title?: string;
  detail?: string;
  extras?: {
    result_codes?: {
      transaction?: string;
      operations?: string[];
    };
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** HTTP status → human message */
const STATUS_MESSAGES: Record<number, string> = {
  400: 'The request was malformed. Please check the payment details and try again.',
  401: 'Authentication with the Stellar network failed. Check your API credentials.',
  403: 'Access to the Stellar network was denied. Contact your infrastructure provider.',
  404: 'The requested resource could not be found on the Stellar network.',
  406: 'The server cannot respond with the requested format.',
  408: 'The request timed out. Please check your connection and try again.',
  429: 'Too many requests to the Stellar network. Please wait a moment and try again.',
  500: 'The Stellar network encountered an internal error. Please try again later.',
  502: 'The Stellar network received an invalid response. Please try again.',
  503: 'The Stellar network is temporarily unavailable. Please try again later.',
  504: 'The Stellar network took too long to respond. Please try again.',
};

/** Transaction-level result codes → human message */
const TX_RESULT_MESSAGES: Record<string, string> = {
  tx_bad_auth:
    'Transaction authentication failed — the signatures are invalid or missing.',
  tx_bad_seq:
    'Transaction sequence number is wrong. Your wallet may be out of sync; refresh and try again.',
  tx_insufficient_balance:
    'Insufficient XLM balance to cover the transaction fee.',
  tx_insufficient_fee:
    'The transaction fee is too low. Try increasing the fee.',
  tx_too_late:
    'The transaction has expired. Please submit a new payment.',
  tx_too_early:
    'The transaction timebound starts in the future. Check your device clock.',
  tx_internal_error:
    'An internal error occurred while processing the transaction. Please try again.',
  tx_fee_bump_inner_failed:
    'The fee-bump transaction’s inner transaction failed.',
  tx_fee_bump_inner_success:
    'The fee-bump transaction was processed but the inner transaction failed.',
  tx_not_supported: 'This transaction type is not supported by the network.',
  tx_bad_min_time: 'Invalid transaction minimum time bound.',
  tx_bad_max_time: 'Invalid transaction maximum time bound.',
  tx_no_source_account: 'The source account for this transaction was not found.',
  tx_missing_operation:
    'The transaction has no operations. At least one operation is required.',
  tx_overflow: 'A numeric overflow occurred — amounts may be too large.',
  tx_soroban_invalid:
    'The Soroban contract invocation is invalid. Check the contract and parameters.',
};

/** Operation-level result codes → human message */
const OP_RESULT_MESSAGES: Record<string, string> = {
  op_no_trust:
    'The destination account has no trustline for this asset, so it cannot receive the payment.',
  op_src_no_trust:
    'Your wallet has no trustline for this asset, so it cannot be sent.',
  op_underfunded:
    'Insufficient balance to complete this payment.',
  op_line_full:
    'The destination’s trustline limit has been reached, so the payment cannot be received.',
  op_src_not_authorized:
    'Your wallet is not authorized to send this asset.',
  op_under_dest_min:
    'The payment amount is below the destination’s minimum required amount.',
  op_cross_self:
    'You cannot send a payment to your own account.',
  op_malformed:
    'The payment operation was malformed. Check the destination address and amount.',
  op_no_issuer: 'The asset issuer account does not exist.',
  op_low_reserve: 'Insufficient XLM to meet the minimum reserve requirement.',
  op_no_account: 'The destination account does not exist on the network.',
  op_not_authorized:
    'The destination account is not authorized to hold this asset.',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Try to extract an HTTP status from any error shape. */
const extractStatus = (err: HorizonErrorLike): number | undefined => {
  // Top-level status
  if (typeof err.status === 'number' && err.status > 0) return err.status;
  // Axios / Horizon SDK style
  const resStatus = err.response?.status;
  if (typeof resStatus === 'number' && resStatus > 0) return resStatus;
  return undefined;
};

/**
 * Normalise the transaction result code string.
 * Stellar may prefix with "tx_" (e.g. "tx_insufficient_balance") or return a
 * bare code (e.g. "insufficient_balance"). We try both.
 */
const normaliseTxCode = (code: string): string =>
  code.startsWith('tx_') ? code : `tx_${code}`;

/**
 * Normalise an operation result code string.
 * Stellar may prefix with "op_" (e.g. "op_no_trust") or return a bare code
 * (e.g. "no_trust"). We try both.
 */
const normaliseOpCode = (code: string): string =>
  code.startsWith('op_') ? code : `op_${code}`;

/**
 * Walk the error shape and collect every result-code string we can find.
 * Handles both `extras.result_codes` at the top level and nested inside
 * `response.data.extras.result_codes`.
 */
const collectResultCodes = (err: HorizonErrorLike): string[] => {
  const codes: string[] = [];

  const check = (extras: HorizonErrorLike['extras']) => {
    if (!extras?.result_codes) return;
    const { transaction, operations } = extras.result_codes;
    if (typeof transaction === 'string' && transaction.length > 0) {
      codes.push(transaction.toLowerCase());
    }
    if (Array.isArray(operations)) {
      for (const op of operations) {
        if (typeof op === 'string' && op.length > 0) {
          codes.push(op.toLowerCase());
        }
      }
    }
  };

  // Top-level extras
  check(err.extras);
  // Nested inside response.data.extras
  check(err.response?.data?.extras);

  return codes;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Map any Stellar / Horizon error to a user-facing English message.
 *
 * @example
 * ```ts
 * try {
 *   await server.submitTransaction(tx);
 * } catch (err) {
 *   toast.error(horizonStatus(err));
 * }
 * ```
 */
export const horizonStatus = (error: unknown): string => {
  if (error === null || error === undefined) {
    return 'An unknown error occurred.';
  }

  // Plain string
  if (typeof error === 'string') {
    return error;
  }

  const err = error as HorizonErrorLike;

  // ── 1. Check result codes (most specific) ─────────────────────────
  const codes = collectResultCodes(err);

  for (const rawCode of codes) {
    // Operation codes first (more specific)
    const opCode = normaliseOpCode(rawCode);
    if (OP_RESULT_MESSAGES[opCode]) return OP_RESULT_MESSAGES[opCode];

    // Transaction codes
    const txCode = normaliseTxCode(rawCode);
    if (TX_RESULT_MESSAGES[txCode]) return TX_RESULT_MESSAGES[txCode];
  }

  // ── 2. Check HTTP status (high-signal codes; 400 is a container) ──
  const status = extractStatus(err);
  // HTTP 400 always wraps more-specific result codes — when codes are
  // present (even unrecognised ones) we defer to title / detail first.
  const skipStatus = status === 400 && codes.length > 0;
  if (status !== undefined && !skipStatus && STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status];
  }

  // ── 3. Check title / detail from Horizon error response ───────────
  const title =
    typeof err.title === 'string' && err.title.length > 0
      ? err.title
      : err.response?.data?.title;
  const detail =
    typeof err.detail === 'string' && err.detail.length > 0
      ? err.detail
      : err.response?.data?.detail;

  if (title) {
    return detail ? `${title}: ${detail}` : title;
  }

  // ── 4. HTTP 400 safety net (container status we skipped earlier) ──
  if (status === 400) {
    return STATUS_MESSAGES[400];
  }

  // ── 5. Fallback to error.message ──────────────────────────────────
  if (typeof err.message === 'string' && err.message.length > 0) {
    return err.message;
  }

  return 'An unexpected error occurred while communicating with the Stellar network.';
};

export default horizonStatus;
