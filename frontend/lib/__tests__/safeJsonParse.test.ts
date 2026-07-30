import { describe, it, expect } from 'vitest';
import { safeJsonParse, tryJsonParse } from '../safeJsonParse';

describe('safeJsonParse', () => {
  it('parses valid JSON object', () => {
    const result = safeJsonParse<{ name: string }>('{"name":"hello"}');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'hello' });
    }
  });

  it('parses valid JSON array', () => {
    const result = safeJsonParse<number[]>('[1,2,3]');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([1, 2, 3]);
    }
  });

  it('parses primitive values', () => {
    expect(safeJsonParse('42').success).toBe(true);
    expect(safeJsonParse('"str"').success).toBe(true);
    expect(safeJsonParse('true').success).toBe(true);
    expect(safeJsonParse('null').success).toBe(true);
  });

  it('returns error for invalid JSON', () => {
    const result = safeJsonParse('{invalid}');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(Error);
    }
  });

  it('returns error for empty string', () => {
    const result = safeJsonParse('');
    expect(result.success).toBe(false);
  });

  it('returns error for random text', () => {
    const result = safeJsonParse('not json at all');
    expect(result.success).toBe(false);
  });

  it('returns error for truncated JSON', () => {
    const result = safeJsonParse('{"key": "value"');
    expect(result.success).toBe(false);
  });
});

describe('tryJsonParse', () => {
  it('returns parsed data on success', () => {
    expect(tryJsonParse<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it('returns null on invalid input', () => {
    expect(tryJsonParse('bad')).toBeNull();
  });

  it('returns null on empty string', () => {
    expect(tryJsonParse('')).toBeNull();
  });

  it('parses primitives', () => {
    expect(tryJsonParse<number>('42')).toBe(42);
    expect(tryJsonParse<string>('"text"')).toBe('text');
    expect(tryJsonParse<boolean>('false')).toBe(false);
    expect(tryJsonParse<null>('null')).toBeNull();
  });
});
