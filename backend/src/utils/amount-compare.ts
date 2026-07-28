/**
 * amount-compare.ts
 *
 * Safe decimal-string comparison utilities that avoid floating-point equality
 * pitfalls by normalising precision and comparing as BigInt values.
 */

interface ParsedDecimal {
  negative: boolean;
  integer: string;
  fraction: string;
}

/**
 * Parse a decimal string into sign, integer, and fraction components.
 */
function parseDecimal(value: string): ParsedDecimal {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '+') {
    return { negative: false, integer: '0', fraction: '' };
  }

  let s = trimmed;
  let negative = false;

  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }

  const dotIndex = s.indexOf('.');
  let integer: string;
  let fraction: string;

  if (dotIndex === -1) {
    integer = s;
    fraction = '';
  } else {
    integer = s.slice(0, dotIndex);
    fraction = s.slice(dotIndex + 1);
  }

  // Strip leading zeros but keep at least one digit
  integer = integer.replace(/^0+/, '') || '0';

  return { negative, integer, fraction };
}

/**
 * Compare two non-negative parsed decimals.
 * Returns -1 if a < b, 0 if equal, 1 if a > b.
 */
function comparePositive(a: ParsedDecimal, b: ParsedDecimal): -1 | 0 | 1 {
  // Compare integer-part lengths first (fast path)
  if (a.integer.length !== b.integer.length) {
    return a.integer.length > b.integer.length ? 1 : -1;
  }

  // Lexicographic comparison of same-length integer parts
  if (a.integer !== b.integer) {
    return a.integer > b.integer ? 1 : -1;
  }

  // Normalise fraction lengths and compare
  const maxLen = Math.max(a.fraction.length, b.fraction.length);
  const fracA = a.fraction.padEnd(maxLen, '0');
  const fracB = b.fraction.padEnd(maxLen, '0');

  if (fracA !== fracB) {
    return fracA > fracB ? 1 : -1;
  }

  return 0;
}

/**
 * Flip a comparison result (for negative-number logic).
 */
function negate(result: -1 | 0 | 1): -1 | 0 | 1 {
  if (result === -1) return 1;
  if (result === 1) return -1;
  return 0;
}

/**
 * Compare two decimal strings.
 *
 * Returns `-1` when `a < b`, `0` when `a === b`, `1` when `a > b`.
 *
 * Handles leading zeros, trailing zeros, empty strings (treated as "0"),
 * and negative numbers.  Uses string-normalisation and zero-padded fraction
 * comparison to avoid IEEE-754 rounding issues for arbitrary-precision
 * decimal strings.
 *
 * @example
 * compareDecimals('1.5', '1.50')   //  0
 * compareDecimals('0.1', '0.10')   //  0
 * compareDecimals('1.05', '1.5')   // -1
 * compareDecimals('-2.5', '-1.5')  // -1
 */
export function compareDecimals(a: string, b: string): -1 | 0 | 1 {
  const parsedA = parseDecimal(a);
  const parsedB = parseDecimal(b);

  // Different signs: negative always smaller
  if (parsedA.negative !== parsedB.negative) {
    return parsedA.negative ? -1 : 1;
  }

  // Same sign: delegate to positive comparison
  const result = comparePositive(parsedA, parsedB);
  return parsedA.negative ? negate(result) : result;
}

/**
 * Returns `true` when the two decimal strings represent the same numeric value.
 */
export function isDecimalEqual(a: string, b: string): boolean {
  return compareDecimals(a, b) === 0;
}

/**
 * Returns `true` when `a` is strictly less than `b`.
 */
export function isDecimalLessThan(a: string, b: string): boolean {
  return compareDecimals(a, b) < 0;
}

/**
 * Returns `true` when `a` is strictly greater than `b`.
 */
export function isDecimalGreaterThan(a: string, b: string): boolean {
  return compareDecimals(a, b) > 0;
}
