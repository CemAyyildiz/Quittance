import { describe, it, expect } from "vitest";
import { formatStroops } from "../formatStroops";

// ---------------------------------------------------------------------------
// Happy path — bigint inputs (primary use case)
// ---------------------------------------------------------------------------

describe("formatStroops with bigint input", () => {
  it("formats zero stroops", () => {
    expect(formatStroops(0n)).toBe("0.0000000");
  });

  it("formats one stroop", () => {
    expect(formatStroops(1n)).toBe("0.0000001");
  });

  it("formats one unit (10 million stroops)", () => {
    expect(formatStroops(10_000_000n)).toBe("1.0000000");
  });

  it("formats a mixed integer+fraction amount", () => {
    expect(formatStroops(12_345_678n)).toBe("1.2345678");
  });

  it("formats a large round amount with thousands grouping", () => {
    // 123,456,789,012 stroops = 12,345.6789012 units
    expect(formatStroops(123_456_789_012n)).toBe("12,345.6789012");
  });

  it("formats a very large i128-scale amount", () => {
    // 9,999,999,999,999,999,999,999,999,999,999 stroops
    const huge = 9_999_999_999_999_999_999_999_999_999_999n;
    const result = formatStroops(huge);
    // The units portion should contain thousands separators
    expect(result).toMatch(/^[0-9,]+\.\d{7}$/);
    expect(result.endsWith(".9999999")).toBe(true);
  });

  it("formats a negative amount", () => {
    expect(formatStroops(-10_000_000n)).toBe("-1.0000000");
  });

  it("formats a small negative stroop count", () => {
    expect(formatStroops(-1n)).toBe("-0.0000001");
  });

  it("formats the maximum i128 value without precision loss", () => {
    // i128::MAX = 2^127 - 1 = 170141183460469231731687303715884105727
    const i128max = (1n << 127n) - 1n;
    const result = formatStroops(i128max);
    // Must have 7 fractional digits and no exponential notation
    expect(result).toMatch(/^-?[0-9,]+\.\d{7}$/);
  });
});

// ---------------------------------------------------------------------------
// Happy path — number and string convenience overloads
// ---------------------------------------------------------------------------

describe("formatStroops with number input", () => {
  it("formats a finite number as stroops", () => {
    expect(formatStroops(0)).toBe("0.0000000");
  });

  it("formats a positive number", () => {
    expect(formatStroops(10_000_000)).toBe("1.0000000");
  });

  it("formats a negative number", () => {
    expect(formatStroops(-10_000_000)).toBe("-1.0000000");
  });

  it("truncates fractional numbers using Math.trunc", () => {
    // 10.9 stroops is impossible (stroops are indivisible), but if
    // someone passes a fractional number we truncate rather than round.
    expect(formatStroops(10.9)).toBe("0.0000010");
  });
});

describe("formatStroops with string input", () => {
  it("parses a string integer", () => {
    expect(formatStroops("10000000")).toBe("1.0000000");
  });

  it("parses a negative string", () => {
    expect(formatStroops("-10000000")).toBe("-1.0000000");
  });
});

// ---------------------------------------------------------------------------
// Invalid / edge-case inputs
// ---------------------------------------------------------------------------

describe("formatStroops invalid inputs", () => {
  it("throws on NaN", () => {
    expect(() => formatStroops(NaN)).toThrow(RangeError);
  });

  it("throws on Infinity", () => {
    expect(() => formatStroops(Infinity)).toThrow(RangeError);
  });

  it("throws on -Infinity", () => {
    expect(() => formatStroops(-Infinity)).toThrow(RangeError);
  });

  it("throws on a non-numeric string", () => {
    expect(() => formatStroops("not-a-number")).toThrow(SyntaxError);
  });

  it("throws on a string with decimals (not a valid integer)", () => {
    // BigInt("1.5") throws SyntaxError
    expect(() => formatStroops("1.5")).toThrow(SyntaxError);
  });

  it("throws on empty string", () => {
    expect(() => formatStroops("")).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// Invariant: output always has exactly 7 decimal places
// ---------------------------------------------------------------------------

describe("formatStroops invariants", () => {
  const testCases: bigint[] = [
    0n,
    1n,
    9n,
    10n,
    99n,
    999_999n,
    1_000_000n,
    9_999_999n,
    10_000_000n,
    99_999_999n,
    100_000_000n,
    1_234_567_890n,
    9_999_999_999n,
    10_000_000_000n,
    -1n,
    -10_000_000n,
    170141183460469231731687303715884105727n, // i128::MAX
  ];

  for (const tc of testCases) {
    it(`always has 7 decimals for ${tc}n`, () => {
      const result = formatStroops(tc);
      expect(result).toMatch(/^-?[0-9,]+\.\d{7}$/);
    });
  }
});
