/**
 * Parses a user-entered amount string into a safe, canonical decimal string
 * (e.g. "1,234.56" -> "1234.56") or `undefined` if the input is not a valid
 * non-negative decimal amount.
 *
 * Handles both US ("1,234.56") and European ("1.234,56") thousands/decimal
 * separator conventions. When only one separator type is present, the
 * standard "groups of three digits" convention is used to decide whether it
 * marks a thousands group (e.g. "1,234" -> "1234") or a decimal point
 * (e.g. "1,5" -> "1.5").
 */

const ALLOWED_CHARACTERS = /^[\d.,]+$/;

function hasValidThousandsGrouping(digits: string, separator: string): boolean {
  const groups = digits.split(separator);
  if (groups.length < 2 || groups.some((group) => group.length === 0)) {
    return false;
  }

  const [firstGroup, ...restGroups] = groups;
  return firstGroup.length <= 3 && restGroups.every((group) => group.length === 3);
}

function stripLeadingZeros(digits: string): string {
  return digits.replace(/^0+(?=\d)/, '');
}

export function amountParse(input: string): string | undefined {
  const trimmed = input?.trim();
  if (!trimmed) return undefined;

  if (!ALLOWED_CHARACTERS.test(trimmed)) return undefined;

  const lastDot = trimmed.lastIndexOf('.');
  const lastComma = trimmed.lastIndexOf(',');
  const dotCount = trimmed.split('.').length - 1;
  const commaCount = trimmed.split(',').length - 1;

  let integerPart: string;
  let fractionPart = '';

  if (lastDot !== -1 && lastComma !== -1) {
    // Both separators are present: whichever occurs last is the decimal
    // point, and the other is the thousands grouping separator.
    const decimalIsComma = lastComma > lastDot;
    const decimalIndex = decimalIsComma ? lastComma : lastDot;
    const decimalCount = decimalIsComma ? commaCount : dotCount;
    const thousandsChar = decimalIsComma ? '.' : ',';

    if (decimalCount > 1) return undefined;

    const rawIntegerPart = trimmed.slice(0, decimalIndex);
    if (!hasValidThousandsGrouping(rawIntegerPart, thousandsChar)) return undefined;

    integerPart = rawIntegerPart.split(thousandsChar).join('');
    fractionPart = trimmed.slice(decimalIndex + 1);
  } else if (lastDot !== -1 || lastComma !== -1) {
    // Only one type of separator is present, so its role is ambiguous
    // between a thousands separator and a decimal point.
    const sepChar = lastDot !== -1 ? '.' : ',';
    const sepCount = lastDot !== -1 ? dotCount : commaCount;
    const lastSepIndex = lastDot !== -1 ? lastDot : lastComma;
    const headLength = lastSepIndex;
    const trailingDigits = trimmed.length - lastSepIndex - 1;

    if (sepCount > 1) {
      // A separator can only repeat if it groups thousands (a decimal point
      // cannot appear twice), so validate the grouping.
      if (!hasValidThousandsGrouping(trimmed, sepChar)) return undefined;
      integerPart = trimmed.split(sepChar).join('');
    } else if (trailingDigits === 3 && headLength > 0 && headLength <= 3) {
      // A single separator followed by exactly three digits, with a short
      // leading group, matches the standard thousands-grouping shape
      // (e.g. "1,234"), so treat it as a thousands separator.
      integerPart = trimmed.split(sepChar).join('');
    } else {
      integerPart = trimmed.slice(0, lastSepIndex);
      fractionPart = trimmed.slice(lastSepIndex + 1);
    }
  } else {
    integerPart = trimmed;
  }

  if (!/^\d+$/.test(integerPart)) return undefined;
  if (fractionPart && !/^\d+$/.test(fractionPart)) return undefined;

  integerPart = stripLeadingZeros(integerPart) || '0';

  const normalized = fractionPart ? `${integerPart}.${fractionPart}` : integerPart;
  if (!Number.isFinite(Number(normalized))) return undefined;

  return normalized;
}
