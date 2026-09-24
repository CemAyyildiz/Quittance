import { describe, it, expect } from 'vitest';
import { parseAmount } from './amountParse';

describe('parseAmount', () => {
  it('parses integer string', () => {
    expect(parseAmount('1234')).toBe('1234');
  });

  it('parses US-formatted amount', () => {
    expect(parseAmount('1,234.56')).toBe('1234.56');
  });

  it('parses European-formatted amount', () => {
    expect(parseAmount('1.234,56')).toBe('1234.56');
  });

  it('parses amount with dot decimal only', () => {
    expect(parseAmount('1234.56')).toBe('1234.56');
  });

  it('returns undefined for empty string', () => {
    expect(parseAmount('')).toBeUndefined();
  });

  it('returns undefined for whitespace-only string', () => {
    expect(parseAmount('   ')).toBeUndefined();
  });

  it('returns undefined for non-numeric input', () => {
    expect(parseAmount('abc')).toBeUndefined();
  });

  it('returns undefined for negative amount', () => {
    expect(parseAmount('-5')).toBeUndefined();
  });

  it('parses zero', () => {
    expect(parseAmount('0')).toBe('0');
  });

  it('parses amount with many decimal places', () => {
    expect(parseAmount('0.0000001')).toBe('0.0000001');
  });

  it('parses trimmed amount', () => {
    expect(parseAmount('  1234.56  ')).toBe('1234.56');
  });

  it('parses amount with multiple thousands separators (US)', () => {
    expect(parseAmount('1,234,567.89')).toBe('1234567.89');
  });

  it('parses amount with multiple thousands separators (EU)', () => {
    expect(parseAmount('1.234.567,89')).toBe('1234567.89');
  });

  it('returns undefined for multiple decimal dots', () => {
    expect(parseAmount('12.34.56')).toBeUndefined();
  });

  it('returns undefined for string with mixed invalid characters', () => {
    expect(parseAmount('abc123')).toBeUndefined();
  });

  it('returns undefined for amount with both comma and dot as decimal (invalid)', () => {
    expect(parseAmount('1,234.56,78')).toBeUndefined();
  });
});

// --- Delta: sole-separator ambiguity and thousands-grouping fixes ---
//
// The cases above never exercise a *single* comma with no dot, or a
// *repeated* comma/dot with no decimal part at all. Both shapes are
// ambiguous (or, for a decimal point, outright impossible to repeat) and
// were previously mishandled: a lone "1,234" was parsed as the decimal
// 1.234 instead of the thousands amount 1234, and "1,234,567" (no
// decimal part) was rejected outright instead of parsing to 1234567.

test('parses a sole thousands separator with no decimal part as US grouping', () => {
  assert.equal(parseAmount('1,234'), '1234');
});

test('parses multiple thousands groups with no decimal part (US)', () => {
  assert.equal(parseAmount('1,234,567'), '1234567');
});

test('parses multiple thousands groups with no decimal part (EU)', () => {
  assert.equal(parseAmount('1.234.567'), '1234567');
});

test('treats a short trailing group after a sole separator as a decimal point', () => {
  assert.equal(parseAmount('1,5'), '1.5');
  assert.equal(parseAmount('1.5'), '1.5');
  assert.equal(parseAmount('1,23'), '1.23');
});

// --- Delta: comma decimal rejection locked (issue #489) ---
//
// A lone comma with a short trailing group ("1,50") is treated as a
// decimal point, not rejected: the comma is interpreted as the European
// decimal separator and the input parses to "1.50". This is consistent
// with the other sole-separator cases above ("1,5" -> "1.5",
// "1,23" -> "1.23"). Locale-aware parsing is intentionally out of scope.

test('parses a lone comma with a short trailing group as a decimal point', () => {
  assert.equal(parseAmount('1,50'), '1.50');
});

test('treats a long trailing group after a sole separator as a decimal point', () => {
  assert.equal(parseAmount('1,2345'), '1.2345');
});

test('treats a 3-digit trailing group after a long leading group as a decimal point', () => {
  assert.equal(parseAmount('1234,567'), '1234.567');
});

test('returns undefined for malformed thousands grouping', () => {
  assert.equal(parseAmount('1,23,456'), undefined);
  assert.equal(parseAmount('12.34.56.789'), undefined);
});
