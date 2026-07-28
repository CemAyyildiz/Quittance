import test from 'node:test';
import assert from 'node:assert/strict';

import { networkBadgeModel } from './networkBadgeModel.ts';

test('returns TESTNET for testnet values', () => {
  assert.equal(networkBadgeModel('TESTNET'), 'TESTNET');
  assert.equal(networkBadgeModel('testnet'), 'TESTNET');
});

test('returns PUBLIC for public values', () => {
  assert.equal(networkBadgeModel('PUBLIC'), 'PUBLIC');
  assert.equal(networkBadgeModel(' public '), 'PUBLIC');
});

test('falls back to PUBLIC for invalid or empty input', () => {
  assert.equal(networkBadgeModel(undefined), 'PUBLIC');
  assert.equal(networkBadgeModel(''), 'PUBLIC');
  assert.equal(networkBadgeModel('mainnet'), 'PUBLIC');
  assert.equal(networkBadgeModel('production'), 'PUBLIC');
});
