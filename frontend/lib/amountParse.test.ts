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
