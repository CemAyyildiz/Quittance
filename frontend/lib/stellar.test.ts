import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock freighter-api — it targets a browser extension and is not
// available in the Vitest Node environment.  The mock only needs to
// cover the top-level named imports that stellar.ts re-exports.
vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn().mockResolvedValue(false),
  getPublicKey: vi.fn().mockResolvedValue(null),
  signTransaction: vi.fn().mockResolvedValue(''),
  isAllowed: vi.fn().mockResolvedValue(false),
  setAllowed: vi.fn().mockResolvedValue(undefined),
}));

import { isValidPublicKey } from './stellar';

// A well-known, valid Stellar Ed25519 public key (56 chars, starts with G,
// base32-encoded payload).  This is the same key used in publicKeyValidate.test.ts
// and is safe to hardcode — it is not a secret key.
const VALID_KEY = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

describe('isValidPublicKey (Stellar SDK wrapper)', () => {
  // ── valid cases ──────────────────────────────────────────────────

  it('returns true for a valid 56-character G-address', () => {
    expect(isValidPublicKey(VALID_KEY)).toBe(true);
  });

  it('returns true for a second valid key', () => {
    expect(
      isValidPublicKey('GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V'),
    ).toBe(true);
  });

  // ── invalid: short / long / malformed ────────────────────────────

  it('returns false for a string shorter than 56 characters', () => {
    expect(isValidPublicKey(VALID_KEY.slice(0, 30))).toBe(false);
  });

  it('returns false for a string longer than 56 characters', () => {
    expect(isValidPublicKey(VALID_KEY + 'A')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isValidPublicKey('')).toBe(false);
  });

  it('returns false when the key does not start with G', () => {
    // Replace leading G with A — still 56 chars, still base32-ish, but wrong prefix.
    expect(isValidPublicKey('A' + VALID_KEY.slice(1))).toBe(false);
  });

  it('returns false when the key contains invalid base32 characters', () => {
    // '0', '1', '8', '9' are not in the Stellar base32 alphabet.
    expect(isValidPublicKey('G' + '0'.repeat(55))).toBe(false);
    expect(isValidPublicKey('G' + '1'.repeat(55))).toBe(false);
    expect(isValidPublicKey('G' + '8'.repeat(55))).toBe(false);
    expect(isValidPublicKey('G' + '9'.repeat(55))).toBe(false);
  });

  it('returns false for a completely arbitrary string', () => {
    expect(isValidPublicKey('not-a-stellar-key')).toBe(false);
  });

  it('returns false for whitespace-only input', () => {
    expect(isValidPublicKey(' '.repeat(56))).toBe(false);
  });
});
