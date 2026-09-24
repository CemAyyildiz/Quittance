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

  it('falls back to PUBLIC for invalid or empty input', () => {
    expect(networkBadgeModel(undefined)).toBe('PUBLIC');
    expect(networkBadgeModel('')).toBe('PUBLIC');
    expect(networkBadgeModel('mainnet')).toBe('PUBLIC');
    expect(networkBadgeModel('production')).toBe('PUBLIC');
  });
});
