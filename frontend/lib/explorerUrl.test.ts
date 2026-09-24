import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { explorerAccountUrl, explorerTxUrl } from './explorerUrl';

describe('explorerAccountUrl', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  // ── Happy path ──────────────────────────────────────────────

  it('builds a testnet account URL by default (no env, no network arg)', () => {
    const url = explorerAccountUrl('GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H');
    expect(url).toBe(
      'https://stellar.expert/explorer/testnet/account/GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
    );
  });

  it('builds a public network account URL when env is PUBLIC', () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'PUBLIC';
    const url = explorerAccountUrl('GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKL');
    expect(url).toBe(
      'https://stellar.expert/explorer/public/account/GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKL',
    );
  });

  it('accepts an explicit network override (PUBLIC)', () => {
    const url = explorerAccountUrl(
      'GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKL',
      'PUBLIC',
    );
    expect(url).toBe(
      'https://stellar.expert/explorer/public/account/GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKL',
    );
  });

  it('explicit network overrides env', () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'TESTNET';
    const url = explorerAccountUrl(
      'GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKL',
      'PUBLIC',
    );
    expect(url).toContain('/public/account/');
  });

  it('trims whitespace from the address', () => {
    const url = explorerAccountUrl('  GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H  ');
    expect(url).toContain('GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H');
    // no encoded spaces
    expect(url).not.toContain('%20');
  });

  // ── Invalid input ───────────────────────────────────────────

  it('throws TypeError for empty string address', () => {
    expect(() => explorerAccountUrl('')).toThrow(TypeError);
    expect(() => explorerAccountUrl('')).toThrow('address must be a non-empty string');
  });

  it('throws TypeError for whitespace-only address', () => {
    expect(() => explorerAccountUrl('   ')).toThrow(TypeError);
    expect(() => explorerAccountUrl('   ')).toThrow('address must be a non-empty string');
  });

  it('throws TypeError for non-string address (number)', () => {
    expect(() => explorerAccountUrl(42 as unknown as string)).toThrow(TypeError);
  });

  it('throws TypeError for null address', () => {
    expect(() => explorerAccountUrl(null as unknown as string)).toThrow(TypeError);
  });

  it('throws TypeError for undefined address', () => {
    expect(() => explorerAccountUrl(undefined as unknown as string)).toThrow(TypeError);
  });
});

describe('explorerTxUrl', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  // ── Happy path ──────────────────────────────────────────────

  it('builds a testnet tx URL by default', () => {
    const url = explorerTxUrl('abc123def456');
    expect(url).toBe('https://stellar.expert/explorer/testnet/tx/abc123def456');
  });

  it('builds a public network tx URL when env is PUBLIC', () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'PUBLIC';
    const url = explorerTxUrl('deadbeefcafe');
    expect(url).toBe('https://stellar.expert/explorer/public/tx/deadbeefcafe');
  });

  it('accepts explicit network override (TESTNET)', () => {
    const url = explorerTxUrl('deadbeefcafe', 'TESTNET');
    expect(url).toContain('/testnet/tx/');
  });

  it('trims whitespace from the hash', () => {
    const url = explorerTxUrl('  abc123def456  ');
    expect(url).toContain('abc123def456');
    expect(url).not.toContain('%20');
  });

  // ── Invalid input ───────────────────────────────────────────

  it('throws TypeError for empty string hash', () => {
    expect(() => explorerTxUrl('')).toThrow(TypeError);
    expect(() => explorerTxUrl('')).toThrow('txHash must be a non-empty string');
  });

  it('throws TypeError for whitespace-only hash', () => {
    expect(() => explorerTxUrl('   ')).toThrow(TypeError);
    expect(() => explorerTxUrl('   ')).toThrow('txHash must be a non-empty string');
  });

  it('throws TypeError for non-string hash (number)', () => {
    expect(() => explorerTxUrl(123 as unknown as string)).toThrow(TypeError);
  });
});
