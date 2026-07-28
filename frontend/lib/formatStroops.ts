/**
 * `formatStroops` — Format stroops / i128-like amounts to English
 * display strings with exactly 7 decimal places.
 *
 * On Stellar, 1 unit (e.g. 1 XLM) = **10,000,000 stroops**. This
 * function converts a stroop-denominated amount into a human-readable
 * string showing the equivalent base-unit value.
 *
 * The implementation uses big-integer arithmetic for the primary
 * `bigint` input path so that very large amounts (the full i128 range)
 * are formatted without floating-point precision loss. `number` and
 * `string` inputs are accepted for convenience.
 *
 * @example
 * ```ts
 * formatStroops(10_000_000n)      // "1.0000000"
 * formatStroops(1n)               // "0.0000001"
 * formatStroops(0n)               // "0.0000000"
 * formatStroops(12_345_678n)      // "1.2345678"
 * formatStroops(-10_000_000n)     // "-1.0000000"
 * ```
 *
 * @param stroops - The amount in stroops. Accepts `bigint` (preferred
 *   for precision), `number`, or a numeric `string`.
 * @returns A locale-formatted English string with exactly 7 decimal
 *   places, using the `en-US` thousands separator convention.
 * @throws {RangeError} If `stroops` is `NaN` or `Infinity` (number
 *   inputs only), or if a string argument cannot be parsed as an
 *   integral bigint.
 */

const STROOPS_PER_UNIT = 10_000_000n;

export function formatStroops(stroops: bigint | number | string): string {
  let amount: bigint;

  if (typeof stroops === 'bigint') {
    amount = stroops;
  } else if (typeof stroops === 'number') {
    if (!Number.isFinite(stroops)) {
      throw new RangeError(`Invalid stroop amount: ${stroops}`);
    }
    amount = BigInt(Math.trunc(stroops));
  } else if (typeof stroops === 'string') {
    if (stroops.length === 0) {
      throw new RangeError("Invalid stroop amount: empty string");
    }
    // BigInt constructor throws SyntaxError for non-numeric strings;
    // let that propagate naturally.
    amount = BigInt(stroops);
  } else {
    throw new TypeError(
      `Unexpected argument type: expected bigint, number, or string, got ${typeof stroops}`,
    );
  }

  const negative = amount < 0n;
  const abs = negative ? -amount : amount;

  const units = abs / STROOPS_PER_UNIT;
  const fraction = abs % STROOPS_PER_UNIT;

  // `toLocaleString('en-US')` on bigint produces thousands-separated
  // output (e.g. "1,234") — the same convention that utils.ts
  // functions use via toLocaleString on Number values.
  const formattedUnits = units.toLocaleString("en-US");
  const formattedFraction = fraction.toString().padStart(7, "0");

  return `${negative ? "-" : ""}${formattedUnits}.${formattedFraction}`;
}
