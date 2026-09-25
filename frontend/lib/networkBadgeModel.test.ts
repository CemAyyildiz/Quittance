import { describe, it, expect } from 'vitest';
import { networkBadgeModel } from './networkBadgeModel';

describe('networkBadgeModel', () => {
  it('returns TESTNET for testnet values', () => {
    expect(networkBadgeModel('TESTNET')).toBe('TESTNET');
    expect(networkBadgeModel('testnet')).toBe('TESTNET');
  });

  it('returns PUBLIC for public values', () => {
    expect(networkBadgeModel('PUBLIC')).toBe('PUBLIC');
    expect(networkBadgeModel(' public ')).toBe('PUBLIC');
  });

  it('defaults to TESTNET when the value is unset or empty', () => {
    expect(networkBadgeModel(undefined)).toBe('TESTNET');
    expect(networkBadgeModel(null)).toBe('TESTNET');
    expect(networkBadgeModel('')).toBe('TESTNET');
    expect(networkBadgeModel('   ')).toBe('TESTNET');
  });

  it('falls back to PUBLIC for unrecognised input', () => {
    expect(networkBadgeModel('mainnet')).toBe('PUBLIC');
    expect(networkBadgeModel('production')).toBe('PUBLIC');
  });
});
