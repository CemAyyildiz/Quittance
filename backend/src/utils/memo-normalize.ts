/**
 * Normalize a Stellar `MEMO_TEXT` value so two memos can be
 * compared safely. Intended for `MEMO_TEXT` only; the other
 * Stellar memo types (`MEMO_ID`, `MEMO_HASH`, `MEMO_RETURN`)
 * are not strings and must not be passed through this helper.
 *
 * The function is intentionally minimal:
 * - `null` and `undefined` inputs collapse to an empty string
 *   so callers can do straightforward equality checks.
 * - Leading and trailing whitespace is stripped. This matches
 *   or exceeds `String.prototype.trim()` and additionally
 *   removes zero-width characters (U+200B, U+200C, U+200D)
 *   and the byte-order mark (U+FEFF), because payers commonly
 *   paste memos from documents and chat clients that insert
 *   those characters invisibly.
 * - Already-normalized strings are returned unchanged
 *   (identity), so the function is safe to use repeatedly.
 *
 * The implementation does not perform case folding, NFC/NFD
 * unification, internal whitespace collapsing, or a length
 * check against the 28-byte `MEMO_TEXT` limit. Those choices
 * keep the function predictable and reversible, which matters
 * because memo values are signed by the payer.
 */
const STRIP_RE =
  /^[\s\u00A0\u200B-\u200D\u2028\u2029\uFEFF]+|[\s\u00A0\u200B-\u200D\u2028\u2029\uFEFF]+$/g;

export const normalizeMemo = (
  memo: string | null | undefined
): string => {
  if (memo == null) {
    return '';
  }
  return memo.replace(STRIP_RE, '');
};

export default normalizeMemo;
export function normalizeMemo(memo: string | null | undefined): string {
  if (memo == null) return '';
  return memo.trim();
}

export function isMemoEmpty(memo: string | null | undefined): boolean {
  return normalizeMemo(memo) === '';
}

export function memosMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return normalizeMemo(a) === normalizeMemo(b);
}
