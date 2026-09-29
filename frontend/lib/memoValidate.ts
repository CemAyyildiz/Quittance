export interface MemoValidationResult {
  valid: boolean;
  error?: string;
}

/** Maximum Stellar memo text size in UTF-8 bytes. */
export const MEMO_MAX_BYTES = 28;

/**
 * Validate a Stellar text memo (type `MEMO_TEXT`).
 *
 * Rejects non-strings, empty/whitespace-only values, and memos whose
 * UTF-8 byte length exceeds {@link MEMO_MAX_BYTES}.
 */
export function memoValidate(memo: unknown): MemoValidationResult {
  if (typeof memo !== 'string') {
    return { valid: false, error: 'Memo must be a string.' };
  }

  if (memo.length === 0 || memo.trim().length === 0) {
    return { valid: false, error: 'Memo cannot be empty.' };
  }

  const byteLength = new TextEncoder().encode(memo).length;

  if (byteLength > MEMO_MAX_BYTES) {
    return {
      valid: false,
      error: `Memo exceeds maximum byte length of ${MEMO_MAX_BYTES} bytes.`,
    };
  }

  return { valid: true };
}

/** Convenience boolean wrapper around {@link memoValidate}. */
export function isMemoValid(memo: unknown): boolean {
  return memoValidate(memo).valid;
}
