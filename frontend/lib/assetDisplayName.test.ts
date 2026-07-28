import test from 'node:test';
import assert from 'node:assert/strict';

import { assetDisplayName } from './assetDisplayName.ts';

test('returns the canonical display name for XLM', () => {
  assert.equal(assetDisplayName('XLM'), 'Stellar Lumens');
});

test('returns the canonical display name for USDC', () => {
  assert.equal(assetDisplayName('USDC'), 'USD Coin');
});

test('returns the input code unchanged for unknown codes', () => {
  assert.equal(assetDisplayName('BTC'), 'BTC');
  assert.equal(assetDisplayName('USDT'), 'USDT');
  assert.equal(assetDisplayName('EURT'), 'EURT');
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
