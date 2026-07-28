import test from 'node:test';
import assert from 'node:assert/strict';

import { assetDisplayName } from './assetDisplayName.ts';

test('returns "Stellar Lumens" for XLM', () => {
  assert.equal(assetDisplayName('XLM'), 'Stellar Lumens');
});

test('returns "USD Coin" for USDC', () => {
  assert.equal(assetDisplayName('USDC'), 'USD Coin');
});

test('returns the input code unchanged for unknown codes', () => {
  assert.equal(assetDisplayName('BTC'), 'BTC');
  assert.equal(assetDisplayName('USDT'), 'USDT');
  assert.equal(assetDisplayName('EURT'), 'EURT');
});

test('trims surrounding whitespace before lookup', () => {
  assert.equal(assetDisplayName('  XLM  '), 'Stellar Lumens');
  assert.equal(assetDisplayName('\tUSDC\n'), 'USD Coin');
});

test('is case-sensitive (lowercase does not match)', () => {
  assert.equal(assetDisplayName('xlm'), 'xlm');
  assert.equal(assetDisplayName('usdc'), 'usdc');
});

test('returns the trimmed code unchanged when unknown', () => {
  assert.equal(assetDisplayName('  BTC  '), 'BTC');
});
