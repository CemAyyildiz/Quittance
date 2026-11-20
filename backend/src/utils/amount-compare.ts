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

/**
 * Shorter aliases used by some Wave contributors and invoice-matching call sites.
 * Behaviour is identical to the `isDecimal*` helpers above.
 */
export const decimalsEqual = isDecimalEqual;
export const decimalsLessThan = isDecimalLessThan;
export const decimalsGreaterThan = isDecimalGreaterThan;

// ---------------------------------------------------------------------------
// Integer-stroop comparison (the money path)
// ---------------------------------------------------------------------------
//
// The generic decimal helpers above are deliberately kept: they compare
// arbitrary-precision *textual* decimals and are used by tests that feed very
// long fractions. Money decisions (invoice creation and payment verification),
// however, must go through the stroop conversion below. Converting both sides
// to an integer number of stroops first means one stroop is never rounded away
// by an intermediate `Number` / `toFixed(7)` round trip.

/** One whole unit of any Stellar asset equals 10,000,000 stroops. */
export const STROOPS_PER_UNIT = 10_000_000n;

/** Largest amount representable by Stellar's signed 64-bit stroop integer. */
export const MAX_STROOPS = 9_223_372_036_854_775_807n;

/** Raised when an amount cannot be represented as a valid Stellar stroop value. */
export class InvalidAmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAmountError';
  }
}

/**
 * Convert a decimal string (or a finite JS number) to an integer stroop count.
 *
 * Rules, in order:
 *   - negatives, `NaN`, infinities and malformed text are rejected;
 *   - more than seven fractional digits are rejected (Stellar's precision);
 *   - values above the signed int64 stroop ceiling are rejected.
 *
 * The conversion is exact: the fractional part is zero-padded to seven digits
 * and concatenated with the integer part, then parsed as a `BigInt`. No
 * floating point arithmetic is involved for decimal-string inputs.
 */
export function amountToStroops(value: string | number): bigint {
  let text: string;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new InvalidAmountError('Amount must be a finite number');
    }
    if (value < 0) {
      throw new InvalidAmountError('Amount must not be negative');
    }
    // `toFixed(7)` rounds; if it changes the value, the input carried more
    // than seven decimal places and must be rejected rather than quietly
    // rounded into a different amount.
    text = value.toFixed(7);
    if (/[eE]/.test(text) || Number(text) !== value) {
      throw new InvalidAmountError('Amount must have at most 7 decimal places');
    }
  } else {
    text = value.trim();
  }

  if (text === '') {
    throw new InvalidAmountError('Amount is required');
  }
  if (text.startsWith('-')) {
    throw new InvalidAmountError('Amount must not be negative');
  }
  if (text.startsWith('+')) {
    text = text.slice(1);
  }
  if (/[eE]/.test(text)) {
    throw new InvalidAmountError('Amount must be a plain decimal string');
  }

  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) {
    throw new InvalidAmountError('Amount must be a decimal number');
  }

  const integerPart = match[1];
  const fractionPart = match[2] ?? '';
  if (fractionPart.length > 7) {
    throw new InvalidAmountError('Amount must have at most 7 decimal places');
  }

  const fractionStroops = fractionPart.padEnd(7, '0');
  const stroops =
    BigInt(integerPart) * STROOPS_PER_UNIT + BigInt(fractionStroops || '0');

  if (stroops > MAX_STROOPS) {
    throw new InvalidAmountError('Amount exceeds the maximum Stellar stroop value');
  }

  return stroops;
}

/** True when both inputs represent exactly the same integer stroop amount. */
export function amountsMatch(a: string | number, b: string | number): boolean {
  try {
    return amountToStroops(a) === amountToStroops(b);
  } catch {
    return false;
  }
}

/** True when the input is a representable, non-negative Stellar amount. */
export function isValidAmount(value: string | number): boolean {
  try {
    amountToStroops(value);
    return true;
  } catch {
    return false;
  }
}

/** Throw `InvalidAmountError` when the input is not a valid Stellar amount. */
export function assertValidAmount(value: string | number): void {
  amountToStroops(value);
}

// Explicit aliases so call sites can use the vocabulary that reads best there.
export const toStroops = amountToStroops;
export const stroopsEqual = amountsMatch;
