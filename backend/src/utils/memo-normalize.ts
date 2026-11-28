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

/**
 * Whether a Stellar transaction memo settles an invoice memo.
 *
 * Invoice memos are always `MEMO_TEXT`. A hash, id or return memo can render
 * as a similar string in a Horizon record, so only a `text` memo is accepted,
 * and it must equal the invoice memo byte for byte: no trimming and no case
 * folding. A missing memo (`memo_type: 'none'`) never matches.
 *
 * `memoType` is Horizon's `memo_type`. Horizon always reports it; when a
 * caller has no type to pass (`undefined`), only the exact-value check runs.
 */
export function textMemoMatchesInvoice(
  txMemo: string | null | undefined,
  txMemoType: string | null | undefined,
  invoiceMemo: string | null | undefined,
): boolean {
  if (txMemoType !== undefined && txMemoType !== 'text') return false;
  if (typeof txMemo !== 'string' || typeof invoiceMemo !== 'string') return false;
  if (invoiceMemo === '') return false;
  return txMemo === invoiceMemo;
}
