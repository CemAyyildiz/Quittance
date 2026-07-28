import test from 'node:test';
import assert from 'node:assert/strict';

import { mailtoProof } from './mailtoProof';

test('returns mailto URL for valid inputs', () => {
  const url = mailtoProof('alice@example.com', 'Invoice #123', 'Please pay here');
  assert.equal(url, 'mailto:alice@example.com?subject=Invoice%20%23123&body=Please%20pay%20here');
});

test('URI-encodes special characters in subject and body', () => {
  const url = mailtoProof('bob@test.org', 'Hello & welcome!', 'Amount: $50\nThanks');
  assert.ok(url.startsWith('mailto:bob@test.org?subject=Hello%20%26%20welcome!&body='));
  assert.ok(url.includes('Amount%3A%20%2450'));
  assert.ok(url.includes('Thanks'));
});

test('returns valid URL when subject is empty', () => {
  const url = mailtoProof('carol@example.com', '', 'Just a note');
  assert.equal(url, 'mailto:carol@example.com?body=Just%20a%20note');
});

test('returns valid URL when body is empty', () => {
  const url = mailtoProof('dave@example.com', 'Greetings', '');
  assert.equal(url, 'mailto:dave@example.com?subject=Greetings');
});

test('returns mailto with only recipient when subject and body are empty', () => {
  const url = mailtoProof('eve@example.com', '', '');
  assert.equal(url, 'mailto:eve@example.com');
});

test('returns empty string for empty email', () => {
  assert.equal(mailtoProof('', 'Subject', 'Body'), '');
});

test('returns empty string for whitespace-only email', () => {
  assert.equal(mailtoProof('   ', 'Subject', 'Body'), '');
});

test('trims whitespace from email', () => {
  const url = mailtoProof('  frank@example.com  ', 'Hi', 'Hello');
  assert.equal(url, 'mailto:frank@example.com?subject=Hi&body=Hello');
});
