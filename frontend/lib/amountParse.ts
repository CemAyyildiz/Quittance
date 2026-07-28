export function parseAmount(input: string): string | undefined {
  const trimmed = input?.trim();
  if (!trimmed) return undefined;

  const lastDot = trimmed.lastIndexOf('.');
  const lastComma = trimmed.lastIndexOf(',');

  let normalized: string;
  if (lastDot === -1 && lastComma === -1) {
    // No separators at all: already a plain integer.
    normalized = trimmed;
  } else if (lastDot !== -1 && lastComma !== -1) {
    // Both separator kinds appear: whichever occurs last is the decimal
    // point, and the other kind is a thousands separator to strip.
    const decimalIsComma = lastComma > lastDot;
    const thousandsChar = decimalIsComma ? '.' : ',';
    const decimalIndex = decimalIsComma ? lastComma : lastDot;

    const rawIntegerPart = trimmed.slice(0, decimalIndex);
    if (!hasValidThousandsGrouping(rawIntegerPart, thousandsChar)) return undefined;

    normalized = `${rawIntegerPart.split(thousandsChar).join('')}.${trimmed.slice(decimalIndex + 1)}`;
  } else {
    // Only one separator kind appears, so its role is ambiguous: it could
    // be a thousands separator (e.g. "1,234" -> 1234) or a decimal point
    // (e.g. "1,5" -> 1.5). A single occurrence followed by exactly three
    // digits, with a short leading digit group, matches the standard
    // "groups of three" thousands convention, so treat it as grouping.
    // A repeated occurrence can only be thousands grouping, since a
    // decimal point cannot appear twice.
    const sepChar = lastDot !== -1 ? '.' : ',';
    const lastSepIndex = lastDot !== -1 ? lastDot : lastComma;
    const sepCount = trimmed.split(sepChar).length - 1;
    const headLength = lastSepIndex;
    const trailingDigits = trimmed.length - lastSepIndex - 1;
    const looksLikeThousandsGrouping =
      sepCount > 1 || (trailingDigits === 3 && headLength > 0 && headLength <= 3);

    if (looksLikeThousandsGrouping) {
      if (!hasValidThousandsGrouping(trimmed, sepChar)) return undefined;
      normalized = trimmed.split(sepChar).join('');
    } else {
      normalized = `${trimmed.slice(0, lastSepIndex)}.${trimmed.slice(lastSepIndex + 1)}`;
    }
  }

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return undefined;

  if (!Number.isFinite(Number(normalized))) return undefined;

  return normalized;
}

// A thousands-grouped integer must have a leading group of 1-3 digits and
// every following group of exactly 3 digits (e.g. "1,234,567", not "1,23,456").
function hasValidThousandsGrouping(digits: string, separator: string): boolean {
  const groups = digits.split(separator);
  if (groups.length < 2 || groups.some((group) => group.length === 0)) return false;
  const [firstGroup, ...restGroups] = groups;
  return firstGroup.length <= 3 && restGroups.every((group) => group.length === 3);
}
