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

  it('trims surrounding whitespace before lookup', () => {
    expect(assetDisplayName('  XLM  ')).toBe('Stellar Lumens');
    expect(assetDisplayName('\tUSDC\n')).toBe('USD Coin');
  });

  it('is case-sensitive (lowercase does not match)', () => {
    expect(assetDisplayName('xlm')).toBe('xlm');
    expect(assetDisplayName('usdc')).toBe('usdc');
  });

  it('returns the trimmed code unchanged when unknown', () => {
    expect(assetDisplayName('  BTC  ')).toBe('BTC');
  });
});
