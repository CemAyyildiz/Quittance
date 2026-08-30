import { describe, it, expect } from 'vitest';
import { assetDisplayName } from './assetDisplayName';

describe('assetDisplayName', () => {
  it('returns "Stellar Lumens" for XLM', () => {
    expect(assetDisplayName('XLM')).toBe('Stellar Lumens');
  });

  it('returns "USD Coin" for USDC', () => {
    expect(assetDisplayName('USDC')).toBe('USD Coin');
  });

  it('returns the input code unchanged for unknown codes', () => {
    expect(assetDisplayName('BTC')).toBe('BTC');
    expect(assetDisplayName('USDT')).toBe('USDT');
    expect(assetDisplayName('EURT')).toBe('EURT');
  });

  it('trims surrounding whitespace before the lookup', () => {
    expect(assetDisplayName('  XLM  ')).toBe('Stellar Lumens');
    expect(assetDisplayName('\tUSDC\n')).toBe('USD Coin');
  });

  it('returns the trimmed code unchanged when unknown and padded', () => {
    expect(assetDisplayName('  BTC  ')).toBe('BTC');
  });

  it('is case-sensitive (lowercase variants do not match)', () => {
    expect(assetDisplayName('xlm')).toBe('xlm');
    expect(assetDisplayName('usdc')).toBe('usdc');
  });

  it('treats the empty string as invalid input', () => {
    expect(assetDisplayName('')).toBe('');
  });

  it('treats whitespace-only input as invalid input', () => {
    expect(assetDisplayName('   ')).toBe('');
    expect(assetDisplayName('\t\n')).toBe('');
  });

  it('treats null and undefined as invalid input', () => {
    expect(assetDisplayName(null)).toBe('');
    expect(assetDisplayName(undefined)).toBe('');
  });
});
