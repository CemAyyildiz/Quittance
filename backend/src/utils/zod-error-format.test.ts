import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createInvoiceSchema } from './validation';
import { formatZodError, formatIfZodError } from './zod-error-format';

// Valid Stellar public key (56 chars, G + base-32)
const VALID_KEY = 'G' + 'A'.repeat(55);

describe('formatZodError', () => {
  it('returns no error for a valid invoice', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 100,
      sellerPublicKey: VALID_KEY,
    });

    assert.equal(result.success, true);
    assert.equal(result.success && formatIfZodError(result.error), null);
  });

  it('formats a single invalid field', () => {
    const result = createInvoiceSchema.safeParse({
      amount: -5,
      sellerPublicKey: VALID_KEY,
    });

    assert.equal(result.success, false);
    if (!result.success) {
      const formatted = formatZodError(result.error);
      assert.equal(formatted.error, 'Validation failed');
      assert.ok(formatted.fields.amount);
      assert.ok(Array.isArray(formatted.fields.amount));
      assert.ok(formatted.fields.amount.length > 0);
      assert.equal(typeof formatted.fields.amount[0], 'string');
    }
  });

  it('formats multiple invalid fields', () => {
    const result = createInvoiceSchema.safeParse({
      amount: -1,
      sellerPublicKey: 'short',
      customerEmail: 'not-an-email',
    });

    assert.equal(result.success, false);
    if (!result.success) {
      const formatted = formatZodError(result.error);
      assert.equal(formatted.error, 'Validation failed');
      assert.ok('amount' in formatted.fields);
      assert.ok('sellerPublicKey' in formatted.fields);
      assert.ok('customerEmail' in formatted.fields);
      assert.equal(Object.keys(formatted.fields).length >= 3, true);
    }
  });

  it('preserves multiple messages for a single field', () => {
    // sellerPublicKey schema: .length(56) + regex(/^G/)
    // A string that's short AND doesn't start with G triggers both
    const result = createInvoiceSchema.safeParse({
      amount: 1,
      sellerPublicKey: 'x',
    });

    assert.equal(result.success, false);
    if (!result.success) {
      const formatted = formatZodError(result.error);
      const msgs = formatted.fields.sellerPublicKey;
      assert.ok(Array.isArray(msgs));
      assert.ok(msgs.length >= 2, `Expected >=2 messages, got ${msgs.length}`);
    }
  });

  it('returns a stable, predictable shape', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 0,
      sellerPublicKey: '',
    });

    assert.equal(result.success, false);
    if (!result.success) {
      const formatted = formatZodError(result.error);

      // Shape invariants
      assert.equal(typeof formatted.error, 'string');
      assert.equal(typeof formatted.fields, 'object');

      for (const key of Object.keys(formatted.fields)) {
        assert.ok(Array.isArray(formatted.fields[key]));
        for (const msg of formatted.fields[key]) {
          assert.equal(typeof msg, 'string');
        }
      }
    }
  });

  it('does not mutate the original ZodError', () => {
    const result = createInvoiceSchema.safeParse({
      amount: -1,
      sellerPublicKey: 'bad',
    });

    assert.equal(result.success, false);
    if (!result.success) {
      const originalIssues = result.error.issues.map((i) => ({ ...i }));
      formatZodError(result.error);
      assert.deepEqual(result.error.issues, originalIssues);
    }
  });
});

describe('formatIfZodError', () => {
  it('returns null for non-ZodError input', () => {
    assert.equal(formatIfZodError(new Error('boom')), null);
    assert.equal(formatIfZodError(null), null);
    assert.equal(formatIfZodError(undefined), null);
    assert.equal(formatIfZodError('string'), null);
  });

  it('returns formatted error for a ZodError', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 'not-a-number',
      sellerPublicKey: 123,
    });

    assert.equal(result.success, false);
    if (!result.success) {
      const formatted = formatIfZodError(result.error);
      assert.ok(formatted !== null);
      assert.equal(formatted!.error, 'Validation failed');
      assert.equal(typeof formatted!.fields, 'object');
    }
  });
});
