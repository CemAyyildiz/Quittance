import { describe, it, expect } from 'vitest';
import { memoValidate, isMemoValid, MEMO_MAX_BYTES } from './memoValidate';

describe('memoValidate', () => {
  it('rejects non-string inputs', () => {
    expect(memoValidate(null)).toEqual({ valid: false, error: 'Memo must be a string.' });
    expect(memoValidate(undefined)).toEqual({ valid: false, error: 'Memo must be a string.' });
    expect(memoValidate(123)).toEqual({ valid: false, error: 'Memo must be a string.' });
  });

  it('rejects empty strings', () => {
    expect(memoValidate('')).toEqual({ valid: false, error: 'Memo cannot be empty.' });
  });

  it('rejects whitespace-only memos', () => {
    expect(memoValidate('   ')).toEqual({ valid: false, error: 'Memo cannot be empty.' });
    expect(memoValidate('\t\n')).toEqual({ valid: false, error: 'Memo cannot be empty.' });
  });

  it('accepts valid short ASCII memos', () => {
    expect(memoValidate('Hello')).toEqual({ valid: true });
    expect(memoValidate('1234567890')).toEqual({ valid: true });
  });

  it('accepts memos exactly at 28 bytes', () => {
    const memo = '1234567890123456789012345678';
    expect(memo.length).toBe(28);
    expect(memoValidate(memo)).toEqual({ valid: true });
  });

  it('rejects memos longer than 28 bytes (ASCII)', () => {
    const memo = '12345678901234567890123456789';
    expect(memo.length).toBe(29);
    expect(memoValidate(memo)).toEqual({
      valid: false,
      error: 'Memo exceeds maximum byte length of 28 bytes.',
    });
  });

  it('accepts valid Unicode memos within 28 bytes', () => {
    // '🚀' is 4 bytes. 7 rockets = 28 bytes.
    const memo = '🚀🚀🚀🚀🚀🚀🚀';
    expect(memoValidate(memo)).toEqual({ valid: true });
  });

  it('rejects Unicode memos exceeding 28 bytes', () => {
    // 8 rockets = 32 bytes
    const memo = '🚀🚀🚀🚀🚀🚀🚀🚀';
    expect(memoValidate(memo)).toEqual({
      valid: false,
      error: 'Memo exceeds maximum byte length of 28 bytes.',
    });
  });

  it('correctly calculates mixed ASCII and Unicode lengths', () => {
    // 'Hello ' (6 bytes) + '🌍' (4 bytes) = 10 bytes
    const memo = 'Hello 🌍';
    expect(memoValidate(memo)).toEqual({ valid: true });

    // 'a' * 25 (25 bytes) + '🚀' (4 bytes) = 29 bytes
    const badMemo = 'a'.repeat(25) + '🚀';
    expect(memoValidate(badMemo)).toEqual({
      valid: false,
      error: 'Memo exceeds maximum byte length of 28 bytes.',
    });
  });
});

describe('isMemoValid', () => {
  it('mirrors memoValidate.valid', () => {
    expect(isMemoValid('ok')).toBe(true);
    expect(isMemoValid('')).toBe(false);
    expect(isMemoValid('   ')).toBe(false);
    expect(isMemoValid('a'.repeat(MEMO_MAX_BYTES + 1))).toBe(false);
  });
});
