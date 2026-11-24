/** Normalize one decimal separator to a canonical dot-decimal string. */
export function parseAmount(input: string): string | undefined {
  const trimmed = input?.trim();
  if (!trimmed || (trimmed.match(/[.,]/g) ?? []).length > 1) return undefined;
  const normalized = trimmed.replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return undefined;
  if (normalized.split('.')[1]?.length > 7) return undefined;
  return Number.isFinite(Number(normalized)) ? normalized : undefined;
}
