import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock freighter-api — it targets a browser extension and is not
// available in the Vitest Node environment.  The mock only needs to
// cover the top-level named imports that stellar.ts re-exports.
vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn(),
  getPublicKey: vi.fn(),
  signTransaction: vi.fn(),
  isAllowed: vi.fn(),
  setAllowed: vi.fn(),
}));

import {
  formatStellarAmount,
  isValidPublicKey,
  checkWalletConnection,
  requestWalletAccess,
  getUserPublicKey,
} from './stellar';

import {
  isConnected,
  getPublicKey,
  isAllowed,
  setAllowed,
} from '@stellar/freighter-api';

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


describe('formatStellarAmount', () => {
  it('strips trailing zeros from a whole-number amount', () => {
    expect(formatStellarAmount('100.0000000')).toBe('100');
  });

  it('strips trailing zeros while keeping significant decimals', () => {
    expect(formatStellarAmount('100.5000000')).toBe('100.5');
  });

  it('strips trailing zeros from a small fractional amount', () => {
    expect(formatStellarAmount('10.1000000')).toBe('10.1');
  });

  it('formats a zero amount without trailing zeros', () => {
    expect(formatStellarAmount('0.0000000')).toBe('0');
  });

  it('passes through an amount with no trailing zeros unchanged', () => {
    expect(formatStellarAmount('42.1234567')).toBe('42.1234567');
  });

  it('accepts a numeric input, not just a string', () => {
    expect(formatStellarAmount(7)).toBe('7');
  });

  it('formats an integer XLM amount', () => {
    expect(formatStellarAmount('1000')).toBe('1000');
  });
});


describe('checkWalletConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when isConnected resolves true', async () => {
    (isConnected as any).mockResolvedValue(true);
    const result = await checkWalletConnection();
    expect(result).toBe(true);
    expect(isConnected).toHaveBeenCalledTimes(1);
  });

  it('returns false when isConnected throws', async () => {
    (isConnected as any).mockRejectedValue(new Error('Wallet not installed'));
    const result = await checkWalletConnection();
    expect(result).toBe(false);
    expect(isConnected).toHaveBeenCalledTimes(1);
  });
});


describe('requestWalletAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when setAllowed and isAllowed succeed', async () => {
    (setAllowed as any).mockResolvedValue(undefined);
    (isAllowed as any).mockResolvedValue(true);
    const result = await requestWalletAccess();
    expect(result).toBe(true);
    expect(setAllowed).toHaveBeenCalledTimes(1);
    expect(isAllowed).toHaveBeenCalledTimes(1);
  });

  it('returns false when setAllowed throws', async () => {
    (setAllowed as any).mockRejectedValue(new Error('User denied access'));
    const result = await requestWalletAccess();
    expect(result).toBe(false);
    expect(setAllowed).toHaveBeenCalledTimes(1);
  });

  it('returns false when isAllowed throws', async () => {
    (setAllowed as any).mockResolvedValue(undefined);
    (isAllowed as any).mockRejectedValue(new Error('Permission check failed'));
    const result = await requestWalletAccess();
    expect(result).toBe(false);
    expect(setAllowed).toHaveBeenCalledTimes(1);
    expect(isAllowed).toHaveBeenCalledTimes(1);
  });
});


describe('getUserPublicKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the resolved public key when getPublicKey succeeds', async () => {
    const publicKey = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
    (getPublicKey as any).mockResolvedValue(publicKey);
    const result = await getUserPublicKey();
    expect(result).toBe(publicKey);
    expect(getPublicKey).toHaveBeenCalledTimes(1);
  });

  it('returns null when getPublicKey throws', async () => {
    (getPublicKey as any).mockRejectedValue(new Error('No account selected'));
    const result = await getUserPublicKey();
    expect(result).toBeNull();
    expect(getPublicKey).toHaveBeenCalledTimes(1);
  });
});
