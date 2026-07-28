import test from 'node:test';
import assert from 'node:assert/strict';

import { parseAmount } from './amountParse.ts';

test('parses integer string', () => {
  assert.equal(parseAmount('1234'), '1234');
});

test('parses US-formatted amount', () => {
  assert.equal(parseAmount('1,234.56'), '1234.56');
});

test('parses European-formatted amount', () => {
  assert.equal(parseAmount('1.234,56'), '1234.56');
});

test('parses amount with dot decimal only', () => {
  assert.equal(parseAmount('1234.56'), '1234.56');
});

test('returns undefined for empty string', () => {
  assert.equal(parseAmount(''), undefined);
});

test('returns undefined for whitespace-only string', () => {
  assert.equal(parseAmount('   '), undefined);
});

test('returns undefined for non-numeric input', () => {
  assert.equal(parseAmount('abc'), undefined);
});

test('returns undefined for negative amount', () => {
  assert.equal(parseAmount('-5'), undefined);
});

test('parses zero', () => {
  assert.equal(parseAmount('0'), '0');
});

test('parses amount with many decimal places', () => {
  assert.equal(parseAmount('0.0000001'), '0.0000001');
});

test('parses trimmed amount', () => {
  assert.equal(parseAmount('  1234.56  '), '1234.56');
});

test('parses amount with multiple thousands separators (US)', () => {
  assert.equal(parseAmount('1,234,567.89'), '1234567.89');
});

test('parses amount with multiple thousands separators (EU)', () => {
  assert.equal(parseAmount('1.234.567,89'), '1234567.89');
});

test('returns undefined for multiple decimal dots', () => {
  assert.equal(parseAmount('12.34.56'), undefined);
});

test('returns undefined for string with mixed invalid characters', () => {
  assert.equal(parseAmount('abc123'), undefined);
});

test('returns undefined for amount with both comma and dot as decimal (invalid)', () => {
  assert.equal(parseAmount('1,234.56,78'), undefined);
});
