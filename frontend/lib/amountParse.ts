export function parseAmount(input: string): string | undefined {
  const trimmed = input?.trim();
  if (!trimmed) return undefined;

  const lastDot = trimmed.lastIndexOf('.');
  const lastComma = trimmed.lastIndexOf(',');

  let normalized: string;
  if (lastDot === -1 && lastComma === -1) {
    normalized = trimmed;
  } else if (lastComma > lastDot) {
    normalized = trimmed.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = trimmed.replace(/,/g, '');
  }

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return undefined;

  if (!Number.isFinite(Number(normalized))) return undefined;

  return normalized;
}
