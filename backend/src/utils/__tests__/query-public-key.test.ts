import { describe, it, expect } from 'vitest';
import { parseSellerPublicKeyQuery } from '../query-public-key';

const repeat = (char: string, times: number): string => char.repeat(times);

/** A syntactically valid Stellar public key (56 chars, starts with G, base-32). */
const VALID_KEY = `G${repeat('A', 55)}` as const;

describe('parseSellerPublicKeyQuery', () => {
  // ❌ Missing
  it('returns an error result when the value is undefined', () => {
    const result = parseSellerPublicKeyQuery(undefined);
    expect(result).toEqual({ ok: false, error: 'sellerPublicKey is required' });
  });

  it('returns an error result when the value is null', () => {
    const result = parseSellerPublicKeyQuery(null);
    expect(result).toEqual({ ok: false, error: 'sellerPublicKey is required' });
  });

  // ❌ Empty
  it('returns an error result when the value is an empty string', () => {
    const result = parseSellerPublicKeyQuery('');
    expect(result).toEqual({ ok: false, error: 'sellerPublicKey is required' });
  });

  it('returns an error result for an empty string even with a custom label', () => {
    const result = parseSellerPublicKeyQuery('', 'payerPublicKey');
    expect(result).toEqual({ ok: false, error: 'payerPublicKey is required' });
  });

  // A whitespace-only value is not the empty string, so it is treated as an
  // invalid key rather than a missing one.
  it('returns an invalid-format error for a whitespace-only value', () => {
    const result = parseSellerPublicKeyQuery('   ');
    expect(result).toEqual({
      ok: false,
      error: 'sellerPublicKey must be a valid Stellar public key',
    });
  });

  it('returns an invalid-format error for a whitespace-only value with a custom label', () => {
    const result = parseSellerPublicKeyQuery('   ', 'payerPublicKey');
    expect(result).toEqual({
      ok: false,
      error: 'payerPublicKey must be a valid Stellar public key',
    });
  });

  // ❌ Invalid
  it('returns an error result when the value is not a valid Stellar public key', () => {
    const result = parseSellerPublicKeyQuery('not-a-valid-key');
    expect(result).toEqual({
      ok: false,
      error: 'sellerPublicKey must be a valid Stellar public key',
    });
  });

  it('returns an error result when the value is too short', () => {
    const result = parseSellerPublicKeyQuery(`G${repeat('A', 10)}`);
    expect(result.ok).toBe(false);
  });

  // ❌ Wrong shape (e.g. repeated query params produce an array)
  it('returns an error result when the value is an array (repeated query param)', () => {
    const result = parseSellerPublicKeyQuery([VALID_KEY, VALID_KEY]);
    expect(result).toEqual({
      ok: false,
      error: 'sellerPublicKey must be a single string value',
    });
  });

  it('returns an error result when the value is an array of empty strings', () => {
    const result = parseSellerPublicKeyQuery(['', '']);
    expect(result).toEqual({
      ok: false,
      error: 'sellerPublicKey must be a single string value',
    });
  });

  it('returns an error result when the value is a plain object (nested query param)', () => {
    const result = parseSellerPublicKeyQuery({ nested: 'value' });
    expect(result.ok).toBe(false);
  });

  it('returns an error result when the value is a number', () => {
    const result = parseSellerPublicKeyQuery(12345);
    expect(result.ok).toBe(false);
  });

  // ✅ Valid
  it('returns an ok result with the value for a valid key', () => {
    const result = parseSellerPublicKeyQuery(VALID_KEY);
    expect(result).toEqual({ ok: true, value: VALID_KEY });
  });

  // ✅ Custom label
  it('interpolates a custom label into the error message', () => {
    const result = parseSellerPublicKeyQuery(undefined, 'payerPublicKey');
    expect(result).toEqual({ ok: false, error: 'payerPublicKey is required' });
  });

  it('interpolates a custom label into the invalid-format error message', () => {
    const result = parseSellerPublicKeyQuery('bad-key', 'payerPublicKey');
    expect(result).toEqual({
      ok: false,
      error: 'payerPublicKey must be a valid Stellar public key',
    });
  });
});
