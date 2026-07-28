import { describe, it, expect } from 'vitest';
import { amountParse } from './amountParse';

describe('amountParse', () => {
  it('parses a plain integer string', () => {
    expect(amountParse('1234')).toBe('1234');
  });

  it('parses zero', () => {
    expect(amountParse('0')).toBe('0');
  });

  it('parses a dot-decimal amount', () => {
    expect(amountParse('1234.56')).toBe('1234.56');
  });

  it('parses an amount with many decimal places', () => {
    expect(amountParse('0.0000001')).toBe('0.0000001');
  });

  it('trims surrounding whitespace', () => {
    expect(amountParse('  1234.56  ')).toBe('1234.56');
  });

  it('strips redundant leading zeros', () => {
    expect(amountParse('01234')).toBe('1234');
    expect(amountParse('000')).toBe('0');
    expect(amountParse('007.50')).toBe('7.50');
  });

  describe('US-style separators (comma thousands, dot decimal)', () => {
    it('parses a US-formatted amount with cents', () => {
      expect(amountParse('1,234.56')).toBe('1234.56');
    });

    it('parses an amount with multiple US thousands separators', () => {
      expect(amountParse('1,234,567.89')).toBe('1234567.89');
    });

    it('parses a sole thousands separator with no decimal part', () => {
      expect(amountParse('1,234')).toBe('1234');
    });

    it('parses multiple thousands groups with no decimal part', () => {
      expect(amountParse('1,234,567')).toBe('1234567');
    });
  });

  describe('European-style separators (dot thousands, comma decimal)', () => {
    it('parses a European-formatted amount with cents', () => {
      expect(amountParse('1.234,56')).toBe('1234.56');
    });

    it('parses an amount with multiple European thousands separators', () => {
      expect(amountParse('1.234.567,89')).toBe('1234567.89');
    });
  });

  describe('ambiguous single separator', () => {
    it('treats a short trailing group as a decimal point', () => {
      expect(amountParse('1,5')).toBe('1.5');
      expect(amountParse('1.5')).toBe('1.5');
      expect(amountParse('1,23')).toBe('1.23');
    });

    it('treats a long trailing group as a decimal point', () => {
      expect(amountParse('1,2345')).toBe('1.2345');
    });

    it('treats a 3-digit trailing group after a long leading group as a decimal point', () => {
      expect(amountParse('1234,567')).toBe('1234.567');
    });
  });

  describe('invalid input', () => {
    it('rejects an empty string', () => {
      expect(amountParse('')).toBeUndefined();
    });

    it('rejects a whitespace-only string', () => {
      expect(amountParse('   ')).toBeUndefined();
    });

    it('rejects non-numeric text', () => {
      expect(amountParse('abc')).toBeUndefined();
      expect(amountParse('abc123')).toBeUndefined();
    });

    it('rejects negative amounts', () => {
      expect(amountParse('-5')).toBeUndefined();
    });

    it('rejects multiple decimal points', () => {
      expect(amountParse('12.34.56')).toBeUndefined();
    });

    it('rejects mixed separators that both look like decimal points', () => {
      expect(amountParse('1,234.56,78')).toBeUndefined();
    });

    it('rejects malformed thousands grouping', () => {
      expect(amountParse('1,23,456')).toBeUndefined();
    });
  });
});
