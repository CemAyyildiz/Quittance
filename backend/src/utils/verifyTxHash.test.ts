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

  it('accepts a 64-character uppercase hex transaction hash', () => {
    const uppercase = 'A'.repeat(64);
    expect(verifyTxHashSchema.safeParse(uppercase).success).toBe(true);
  });

  it('accepts a 64-character mixed-case hex transaction hash', () => {
    const mixed = 'a'.repeat(32) + 'A'.repeat(32);
    expect(verifyTxHashSchema.safeParse(mixed).success).toBe(true);
  });

  it('rejects a 65-character hex transaction hash', () => {
    const tooLong = 'a'.repeat(65);
    expect(verifyTxHashSchema.safeParse(tooLong).success).toBe(false);
  });
});
