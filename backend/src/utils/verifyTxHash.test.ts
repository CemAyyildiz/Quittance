import { describe, it, expect } from 'vitest';
import { verifyTxHashSchema } from './validation';

describe('verifyTxHashSchema', () => {
  it('accepts a valid 64-character hex transaction hash', () => {
    const valid = 'a'.repeat(64);
    expect(verifyTxHashSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a hash that is too short', () => {
    const tooShort = 'a'.repeat(63);
    expect(verifyTxHashSchema.safeParse(tooShort).success).toBe(false);
  });

  it('rejects a hash with non-hex characters', () => {
    const badChars = 'z'.repeat(63) + 'g';
    expect(verifyTxHashSchema.safeParse(badChars).success).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(verifyTxHashSchema.safeParse('').success).toBe(false);
  });
});
