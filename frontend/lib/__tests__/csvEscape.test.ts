import { describe, it, expect } from 'vitest';
import { csvEscape, csvRow } from '../csvEscape';

describe('csvEscape', () => {
  it('returns plain string unchanged', () => {
    expect(csvEscape('hello')).toBe('hello');
  });

  it('returns number as string unchanged', () => {
    expect(csvEscape(42)).toBe('42');
  });

  it('returns empty string unchanged', () => {
    expect(csvEscape('')).toBe('');
  });

  it('escapes value containing comma', () => {
    expect(csvEscape('hello, world')).toBe('"hello, world"');
  });

  it('escapes value containing double quote', () => {
    expect(csvEscape('say "hello"')).toBe('"say ""hello"""');
  });

  it('escapes value containing newline', () => {
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
  });

  it('escapes value containing carriage return', () => {
    expect(csvEscape('line1\r\nline2')).toBe('"line1\r\nline2"');
  });

  it('handles value with both quotes and commas', () => {
    expect(csvEscape('"a, b"')).toBe('"""a, b"""');
  });

  it('returns empty string for null', () => {
    expect(csvEscape(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(csvEscape(undefined)).toBe('');
  });

  it('converts boolean to string', () => {
    expect(csvEscape(true)).toBe('true');
    expect(csvEscape(false)).toBe('false');
  });

  it('converts zero to string', () => {
    expect(csvEscape(0)).toBe('0');
  });
});

describe('csvRow', () => {
  it('joins values with commas', () => {
    expect(csvRow(['a', 'b', 'c'])).toBe('a,b,c');
  });

  it('escapes values that need escaping', () => {
    expect(csvRow(['hello', 'wo, rld', 'say "hi"'])).toBe('hello,"wo, rld","say ""hi"""');
  });

  it('handles empty array', () => {
    expect(csvRow([])).toBe('');
  });

  it('handles mixed types', () => {
    expect(csvRow(['text', 42, null, true])).toBe('text,42,,true');
  });
});
