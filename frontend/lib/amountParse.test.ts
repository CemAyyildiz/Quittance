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

// --- Delta: sole-separator ambiguity and thousands-grouping fixes ---
//
// The cases above never exercise a *single* comma with no dot, or a
// *repeated* comma/dot with no decimal part at all. Both shapes are
// ambiguous (or, for a decimal point, outright impossible to repeat) and
// were previously mishandled: a lone "1,234" was parsed as the decimal
// 1.234 instead of the thousands amount 1234, and "1,234,567" (no
// decimal part) was rejected outright instead of parsing to 1234567.

test('parses a sole thousands separator with no decimal part as US grouping', () => {
  assert.equal(parseAmount('1,234'), '1234');
});

test('parses multiple thousands groups with no decimal part (US)', () => {
  assert.equal(parseAmount('1,234,567'), '1234567');
});

test('parses multiple thousands groups with no decimal part (EU)', () => {
  assert.equal(parseAmount('1.234.567'), '1234567');
});

test('treats a short trailing group after a sole separator as a decimal point', () => {
  assert.equal(parseAmount('1,5'), '1.5');
  assert.equal(parseAmount('1.5'), '1.5');
  assert.equal(parseAmount('1,23'), '1.23');
});

test('treats a long trailing group after a sole separator as a decimal point', () => {
  assert.equal(parseAmount('1,2345'), '1.2345');
});

test('treats a 3-digit trailing group after a long leading group as a decimal point', () => {
  assert.equal(parseAmount('1234,567'), '1234.567');
});

test('returns undefined for malformed thousands grouping', () => {
  assert.equal(parseAmount('1,23,456'), undefined);
  assert.equal(parseAmount('12.34.56.789'), undefined);
});
