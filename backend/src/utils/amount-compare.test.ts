/**
 * amount-compare.test.ts
 *
 * Tests for safe decimal-string comparison utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  compareDecimals,
  isDecimalEqual,
  isDecimalLessThan,
  isDecimalGreaterThan,
  decimalsEqual,
  decimalsLessThan,
  decimalsGreaterThan,
} from './amount-compare';

// ---------------------------------------------------------------------------
// compareDecimals
// ---------------------------------------------------------------------------
describe('compareDecimals', () => {
  describe('equality', () => {
    it('identical strings', () => {
      expect(compareDecimals('1.5', '1.5')).toBe(0);
    });

    it('trailing zeros in fraction', () => {
      expect(compareDecimals('1.5', '1.50')).toBe(0);
    });

    it('multiple trailing zeros', () => {
      expect(compareDecimals('0.1', '0.100')).toBe(0);
    });

    it('no decimal point vs explicit .0', () => {
      expect(compareDecimals('1', '1.0')).toBe(0);
    });

    it('trailing zeros on integer', () => {
      expect(compareDecimals('10', '10.000')).toBe(0);
    });

    it('leading zeros in integer part', () => {
      expect(compareDecimals('001.5', '1.5')).toBe(0);
    });

    it('both zero representations', () => {
      expect(compareDecimals('0', '0.00')).toBe(0);
    });

    it('zero with no digits before decimal', () => {
      expect(compareDecimals('.0', '0.0')).toBe(0);
    });

    it('negative equal values', () => {
      expect(compareDecimals('-1.5', '-1.50')).toBe(0);
    });

    it('empty string treated as zero', () => {
      expect(compareDecimals('', '0')).toBe(0);
    });

    it('whitespace-only treated as zero', () => {
      expect(compareDecimals('  ', '0')).toBe(0);
    });

    it('bare minus treated as zero', () => {
      expect(compareDecimals('-', '0')).toBe(0);
    });

    it('bare plus treated as zero', () => {
      expect(compareDecimals('+', '0')).toBe(0);
    });
  });

  describe('less than', () => {
    it('different integer parts', () => {
      expect(compareDecimals('1.5', '2.0')).toBe(-1);
    });

    it('same integer, different fraction', () => {
      expect(compareDecimals('1.05', '1.5')).toBe(-1);
    });

    it('different integer lengths', () => {
      expect(compareDecimals('99', '100')).toBe(-1);
    });

    it('negative: more negative is smaller', () => {
      expect(compareDecimals('-2.5', '-1.5')).toBe(-1);
    });

    it('negative vs positive', () => {
      expect(compareDecimals('-1.0', '0.5')).toBe(-1);
    });

    it('zero vs positive', () => {
      expect(compareDecimals('0', '0.001')).toBe(-1);
    });

    it('tiny fraction comparison', () => {
      expect(compareDecimals('0.00000001', '0.00000002')).toBe(-1);
    });
  });

  describe('greater than', () => {
    it('different integer parts', () => {
      expect(compareDecimals('2.0', '1.5')).toBe(1);
    });

    it('same integer, different fraction', () => {
      expect(compareDecimals('1.5', '1.05')).toBe(1);
    });

    it('different integer lengths', () => {
      expect(compareDecimals('100', '99')).toBe(1);
    });

    it('negative: less negative is larger', () => {
      expect(compareDecimals('-1.5', '-2.5')).toBe(1);
    });

    it('positive vs negative', () => {
      expect(compareDecimals('0.5', '-1.0')).toBe(1);
    });

    it('positive vs zero', () => {
      expect(compareDecimals('0.001', '0')).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('very long decimal strings', () => {
      const a = '3.141592653589793238462643383279502884197';
      const b = '3.141592653589793238462643383279502884198';
      expect(compareDecimals(a, b)).toBe(-1);
    });

    it('large integer values', () => {
      const big = '999999999999999999999999999999';
      const bigger = '1000000000000000000000000000000';
      expect(compareDecimals(big, bigger)).toBe(-1);
    });

    it('string with leading + sign', () => {
      expect(compareDecimals('+1.5', '1.5')).toBe(0);
    });

    it('just a decimal point', () => {
      expect(compareDecimals('.', '0')).toBe(0);
    });

    it('only fraction after decimal', () => {
      expect(compareDecimals('.5', '0.5')).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// isDecimalEqual
// ---------------------------------------------------------------------------
describe('isDecimalEqual', () => {
  it('returns true for equal values', () => {
    expect(isDecimalEqual('1.00', '1')).toBe(true);
  });

  it('returns false for different values', () => {
    expect(isDecimalEqual('1.01', '1.02')).toBe(false);
  });

  // Regression coverage for the MVP verify handler: a Stellar payment amount
  // serialised with 7 decimal places (e.g. "1.5000000") must match an invoice
  // amount of "1.5" without false mismatches from trailing zeros.
  it('matches Stellar 7-decimal amount against shorter invoice amount', () => {
    const paymentAmount = '1.5000000';
    const invoiceAmount = '1.5';
    expect(isDecimalEqual(paymentAmount, invoiceAmount)).toBe(true);
  });

  it('matches shorter payment amount against 7-decimal invoice amount', () => {
    const paymentAmount = '1.5';
    const invoiceAmount = '1.5000000';
    expect(isDecimalEqual(paymentAmount, invoiceAmount)).toBe(true);
  });

  // Trailing-zero normalization: '1.0' and '1.0000000' represent the same value.
  // compareDecimals pads the shorter fraction with zeros (padEnd) and compares
  // integer parts after stripping leading zeros, so all-zero fractions are equal.
  // This is expected (not surprising) but locked here per #466.
  it('treats 1.0 and 1.0000000 as equal (trailing zeros)', () => {
    expect(isDecimalEqual('1.0', '1.0000000')).toBe(true);
    expect(isDecimalEqual('1.0000000', '1.0')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isDecimalLessThan
// ---------------------------------------------------------------------------
describe('isDecimalLessThan', () => {
  it('returns true when a < b', () => {
    expect(isDecimalLessThan('1.0', '2.0')).toBe(true);
  });

  it('returns false when a > b', () => {
    expect(isDecimalLessThan('2.0', '1.0')).toBe(false);
  });

  it('returns false when equal', () => {
    expect(isDecimalLessThan('1.0', '1.00')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isDecimalGreaterThan
// ---------------------------------------------------------------------------
describe('isDecimalGreaterThan', () => {
  it('returns true when a > b', () => {
    expect(isDecimalGreaterThan('2.0', '1.0')).toBe(true);
  });

  it('returns false when a < b', () => {
    expect(isDecimalGreaterThan('1.0', '2.0')).toBe(false);
  });

  it('returns false when equal', () => {
    expect(isDecimalGreaterThan('1.0', '1.00')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// decimals* aliases (Wave contributor naming)
// ---------------------------------------------------------------------------
describe('decimals* aliases', () => {
  it('decimalsEqual mirrors isDecimalEqual', () => {
    expect(decimalsEqual('1.5', '1.50')).toBe(true);
    expect(decimalsEqual('1.5', '1.51')).toBe(false);
  });

  it('decimalsLessThan mirrors isDecimalLessThan', () => {
    expect(decimalsLessThan('0.1', '0.2')).toBe(true);
    expect(decimalsLessThan('0.2', '0.1')).toBe(false);
  });

  it('decimalsGreaterThan mirrors isDecimalGreaterThan', () => {
    expect(decimalsGreaterThan('0.2', '0.1')).toBe(true);
    expect(decimalsGreaterThan('0.1', '0.2')).toBe(false);
  });
});
