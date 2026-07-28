import { describe, it, expect } from 'vitest';
import { isValidStellarPublicKey } from './publicKeyValidate';

const VALID_KEY = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

describe('isValidStellarPublicKey', () => {
  it('returns true for a valid 56-character G... key', () => {
    expect(isValidStellarPublicKey(VALID_KEY)).toBe(true);
  });

  it('returns true for a different valid key', () => {
    expect(
      isValidStellarPublicKey('GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V'),
    ).toBe(true);
  });

  it('returns false when the string does not start with G', () => {
    expect(isValidStellarPublicKey('A' + VALID_KEY.slice(1))).toBe(false);
  });

  it('returns false when the string is shorter than 56 characters', () => {
    expect(isValidStellarPublicKey(VALID_KEY.slice(0, 55))).toBe(false);
  });

  it('returns false when the string is longer than 56 characters', () => {
    expect(isValidStellarPublicKey(VALID_KEY + 'A')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidStellarPublicKey('')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isValidStellarPublicKey(null as unknown as string)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidStellarPublicKey(undefined as unknown as string)).toBe(false);
  });

  it('returns false when key contains lowercase characters', () => {
    expect(isValidStellarPublicKey(VALID_KEY.toLowerCase())).toBe(false);
  });

  it('returns false when key contains invalid characters (e.g. 0, 1, 8, 9, lowercase, symbols)', () => {
    expect(isValidStellarPublicKey('G' + '0'.padEnd(55, 'Q'))).toBe(false);
    expect(isValidStellarPublicKey('G' + '1'.padEnd(55, 'Q'))).toBe(false);
    expect(isValidStellarPublicKey('G' + '8'.padEnd(55, 'Q'))).toBe(false);
    expect(isValidStellarPublicKey('G' + '9'.padEnd(55, 'Q'))).toBe(false);
    expect(isValidStellarPublicKey('G' + 'l'.padEnd(55, 'Q'))).toBe(false);
    expect(isValidStellarPublicKey('G' + '!'.padEnd(55, 'Q'))).toBe(false);
  });
});
