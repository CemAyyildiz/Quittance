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
