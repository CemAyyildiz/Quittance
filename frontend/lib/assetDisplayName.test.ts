import { describe, it, expect } from 'vitest';
import { assetDisplayName } from './assetDisplayName';

describe('assetDisplayName', () => {
  it('returns "Stellar Lumens" for XLM', () => {
    expect(assetDisplayName('XLM')).toBe('Stellar Lumens');
  });

test('returns the canonical display name for XLM', () => {
  assert.equal(assetDisplayName('XLM'), 'Stellar Lumens');
});

test('returns the canonical display name for USDC', () => {
  assert.equal(assetDisplayName('USDC'), 'USD Coin');
});

  it('returns the input code unchanged for unknown codes', () => {
    expect(assetDisplayName('BTC')).toBe('BTC');
    expect(assetDisplayName('USDT')).toBe('USDT');
    expect(assetDisplayName('EURT')).toBe('EURT');
  });

test('trims surrounding whitespace before the lookup', () => {
  assert.equal(assetDisplayName('  XLM  '), 'Stellar Lumens');
  assert.equal(assetDisplayName('\tUSDC\n'), 'USD Coin');
});

test('returns the trimmed code unchanged when unknown and padded', () => {
  assert.equal(assetDisplayName('  BTC  '), 'BTC');
});

test('is case-sensitive (lowercase variants do not match)', () => {
  assert.equal(assetDisplayName('xlm'), 'xlm');
  assert.equal(assetDisplayName('usdc'), 'usdc');
});

test('treats the empty string as invalid input', () => {
  assert.equal(assetDisplayName(''), '');
});

test('treats whitespace-only input as invalid input', () => {
  assert.equal(assetDisplayName('   '), '');
  assert.equal(assetDisplayName('\t\n'), '');
});

test('treats null and undefined as invalid input', () => {
  assert.equal(assetDisplayName(null), '');
  assert.equal(assetDisplayName(undefined), '');
});
