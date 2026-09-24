import { describe, it, expect } from 'vitest';
import { isValidPublicKey, assertValidPublicKey, STELLAR_KEY_LENGTH } from '../public-key-guard';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build a string of the given length using a repeating character from the
 * valid base-32 alphabet.
 */
const repeat = (char: string, times: number): string => char.repeat(times);

/** A syntactically valid Stellar public key (56 chars, starts with G, base-32). */
const VALID_KEY = `G${repeat('A', 55)}` as const;

/** A valid key that exercises more of the alphabet. */
const VALID_KEY_2 = `G${repeat('Z', 55)}` as const;

/** A valid key including digits (2-7). */
const VALID_KEY_DIGITS = `G${repeat('7', 55)}` as const;

// ── isValidPublicKey ───────────────────────────────────────────────────────

describe('isValidPublicKey', () => {
  // ✅ Valid keys
  it('returns true for a valid all-A public key', () => {
    expect(isValidPublicKey(VALID_KEY)).toBe(true);
  });

  it('returns true for a valid all-Z public key', () => {
    expect(isValidPublicKey(VALID_KEY_2)).toBe(true);
  });

  it('returns true for a valid key with digits (2-7)', () => {
    expect(isValidPublicKey(VALID_KEY_DIGITS)).toBe(true);
  });

  // ❌ Empty / missing
  it('returns false for an empty string', () => {
    expect(isValidPublicKey('')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isValidPublicKey(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidPublicKey(undefined)).toBe(false);
  });

  it('returns false for a plain object', () => {
    expect(isValidPublicKey({})).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isValidPublicKey(12345)).toBe(false);
  });

  // ❌ Wrong length
  it('returns false when key is too short (1 character)', () => {
    expect(isValidPublicKey('G')).toBe(false);
  });

  it('returns false when key is 55 characters', () => {
    expect(isValidPublicKey(`G${repeat('A', 54)}`)).toBe(false);
  });

  it('returns false when key is 57 characters', () => {
    expect(isValidPublicKey(`G${repeat('A', 56)}`)).toBe(false);
  });

  // ❌ Wrong prefix
  it('returns false when key starts with lowercase "g"', () => {
    expect(isValidPublicKey(`g${repeat('A', 55)}`)).toBe(false);
  });

  it('returns false when key starts with "S" (secret seed prefix)', () => {
    expect(isValidPublicKey(`S${repeat('A', 55)}`)).toBe(false);
  });

  it('returns false when key starts with a digit', () => {
    expect(isValidPublicKey(`1${repeat('A', 55)}`)).toBe(false);
  });

  // ❌ Invalid characters
  it('returns false when key contains lowercase letters', () => {
    const key = `G${repeat('a', 55)}`;
    expect(isValidPublicKey(key)).toBe(false);
  });

  it('returns false when key contains "0" (zero)', () => {
    const key = `G${'A'.repeat(30)}0${'A'.repeat(24)}`;
    expect(isValidPublicKey(key)).toBe(false);
  });

  it('returns false when key contains "1" (one)', () => {
    const key = `G${'A'.repeat(30)}1${'A'.repeat(24)}`;
    expect(isValidPublicKey(key)).toBe(false);
  });

  it('returns false when key contains "8" (not in base-32, outside 2-7)', () => {
    const key = `G${'A'.repeat(30)}8${'A'.repeat(24)}`;
    expect(isValidPublicKey(key)).toBe(false);
  });

  it('returns false when key contains "9" (not in base-32, outside 2-7)', () => {
    const key = `G${'A'.repeat(30)}9${'A'.repeat(24)}`;
    expect(isValidPublicKey(key)).toBe(false);
  });

  it('returns false when key contains whitespace', () => {
    const key = `G ${'A'.repeat(54)}`;
    expect(isValidPublicKey(key)).toBe(false);
  });

  it('returns false when key contains special characters', () => {
    const key = `G${'A'.repeat(30)}!${'A'.repeat(24)}`;
    expect(isValidPublicKey(key)).toBe(false);
  });
});

// ── assertValidPublicKey ───────────────────────────────────────────────────

describe('assertValidPublicKey', () => {
  // ✅ Valid keys
  it('does not throw for a valid key', () => {
    expect(() => assertValidPublicKey(VALID_KEY)).not.toThrow();
  });

  it('does not throw for a valid key with digits', () => {
    expect(() => assertValidPublicKey(VALID_KEY_DIGITS)).not.toThrow();
  });

  // ❌ Missing / wrong type
  it('throws for null', () => {
    expect(() => assertValidPublicKey(null)).toThrow('Public key is required');
  });

  it('throws for undefined', () => {
    expect(() => assertValidPublicKey(undefined)).toThrow('Public key is required');
  });

  it('throws for a number', () => {
    expect(() => assertValidPublicKey(42)).toThrow('Public key is required');
  });

  it('throws for an empty string', () => {
    expect(() => assertValidPublicKey('')).toThrow('Public key must not be empty');
  });

  // ❌ Wrong length
  it('throws for a 55-character key', () => {
    const shortKey = `G${repeat('A', 54)}`;
    expect(() => assertValidPublicKey(shortKey)).toThrow(
      `must be exactly ${STELLAR_KEY_LENGTH} characters long`,
    );
  });

  it('throws for a 57-character key', () => {
    const longKey = `G${repeat('A', 56)}`;
    expect(() => assertValidPublicKey(longKey)).toThrow(
      `must be exactly ${STELLAR_KEY_LENGTH} characters long`,
    );
  });

  // ❌ Wrong prefix
  it('throws when key starts with lowercase "g"', () => {
    const key = `g${repeat('A', 55)}`;
    expect(() => assertValidPublicKey(key)).toThrow("must start with 'G'");
  });

  it('throws when key starts with "S"', () => {
    const key = `S${repeat('A', 55)}`;
    expect(() => assertValidPublicKey(key)).toThrow("must start with 'G'");
  });

  // ❌ Invalid characters
  it('throws for key with lowercase letters', () => {
    const key = `G${repeat('a', 55)}`;
    expect(() => assertValidPublicKey(key)).toThrow('contains invalid characters');
  });

  it('throws for key with "8" (not in base-32, outside 2-7)', () => {
    const key = `G${'A'.repeat(30)}8${'A'.repeat(24)}`;
    expect(() => assertValidPublicKey(key)).toThrow('contains invalid characters');
  });

  it('throws for key with "9" (not in base-32, outside 2-7)', () => {
    const key = `G${'A'.repeat(30)}9${'A'.repeat(24)}`;
    expect(() => assertValidPublicKey(key)).toThrow('contains invalid characters');
  });

  it('throws for key with "0" (zero)', () => {
    const key = `G${'A'.repeat(30)}0${'A'.repeat(24)}`;
    expect(() => assertValidPublicKey(key)).toThrow('contains invalid characters');
  });

  // ✅ Custom label
  it('interpolates the custom label into the error message', () => {
    expect(() => assertValidPublicKey('', 'sellerPublicKey')).toThrow(
      'sellerPublicKey must not be empty',
    );
  });

  it('interpolates custom label into length error', () => {
    const shortKey = `G${repeat('A', 54)}`;
    expect(() => assertValidPublicKey(shortKey, 'sellerPublicKey')).toThrow(
      'sellerPublicKey must be exactly',
    );
  });

  it('interpolates custom label into prefix error', () => {
    const key = `S${repeat('A', 55)}`;
    expect(() => assertValidPublicKey(key, 'payerPublicKey')).toThrow(
      'payerPublicKey must start with',
    );
  });

  it('includes the custom "Seller key" label in the thrown error', () => {
    expect(() => assertValidPublicKey('', 'Seller key')).toThrow(
      'Seller key must not be empty',
    );
  });
});
