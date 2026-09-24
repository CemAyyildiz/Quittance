import { describe, it, expect } from 'vitest';

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

    expect(result.success).toBe(true);
    expect(result.success && formatIfZodError(result.error)).toBe(null);
  });

  it('formats a single invalid field', () => {
    const result = createInvoiceSchema.safeParse({
      amount: -5,
      sellerPublicKey: VALID_KEY,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(formatted.error).toBe('Validation failed');
      expect(formatted.fields.amount).toBeDefined();
      expect(Array.isArray(formatted.fields.amount)).toBe(true);
      expect(formatted.fields.amount.length).toBeGreaterThan(0);
      expect(typeof formatted.fields.amount[0]).toBe('string');
    }
  });

  it('formats multiple invalid fields', () => {
    const result = createInvoiceSchema.safeParse({
      amount: -1,
      sellerPublicKey: 'short',
      customerEmail: 'not-an-email',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(formatted.error).toBe('Validation failed');
      expect('amount' in formatted.fields).toBe(true);
      expect('sellerPublicKey' in formatted.fields).toBe(true);
      expect('customerEmail' in formatted.fields).toBe(true);
      expect(Object.keys(formatted.fields).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('preserves multiple messages for a single field', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 1,
      sellerPublicKey: 'x',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodError(result.error);
      const msgs = formatted.fields.sellerPublicKey;
      expect(Array.isArray(msgs)).toBe(true);
      expect(msgs.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('returns a stable, predictable shape', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 0,
      sellerPublicKey: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(typeof formatted.error).toBe('string');
      expect(typeof formatted.fields).toBe('object');

      for (const key of Object.keys(formatted.fields)) {
        expect(Array.isArray(formatted.fields[key])).toBe(true);
        for (const msg of formatted.fields[key]) {
          expect(typeof msg).toBe('string');
        }
      }
    }
  });

  it('does not mutate the original ZodError', () => {
    const result = createInvoiceSchema.safeParse({
      amount: -1,
      sellerPublicKey: 'bad',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const originalIssues = result.error.issues.map((i) => ({ ...i }));
      formatZodError(result.error);
      expect(result.error.issues).toEqual(originalIssues);
    }
  });
});

describe('formatIfZodError', () => {
  it('returns null for non-ZodError input', () => {
    expect(formatIfZodError(new Error('boom'))).toBe(null);
    expect(formatIfZodError(null)).toBe(null);
    expect(formatIfZodError(undefined)).toBe(null);
    expect(formatIfZodError('string')).toBe(null);
  });

  it('returns formatted error for a ZodError', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 'not-a-number',
      sellerPublicKey: 123,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatIfZodError(result.error);
      expect(formatted).not.toBe(null);
      expect(formatted!.error).toBe('Validation failed');
      expect(typeof formatted!.fields).toBe('object');
    }
  });
});
