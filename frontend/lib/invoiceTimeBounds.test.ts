import { describe, it, expect } from 'vitest';
import {
  EXPIRING_SOON_MESSAGE,
  MIN_PAYMENT_WINDOW_SECONDS,
  getInvoiceTimeBounds,
  toUnixSeconds,
} from './invoiceTimeBounds';

const NOW_MS = Date.UTC(2030, 0, 1, 0, 0, 0);
const NOW_SEC = NOW_MS / 1000;
const expiryIn = (seconds: number) => new Date(NOW_MS + seconds * 1000).toISOString();

describe('getInvoiceTimeBounds', () => {
  it('uses the invoice expiry as maxTime in unix seconds', () => {
    expect(getInvoiceTimeBounds(expiryIn(3600), NOW_MS)).toEqual({
      ok: true,
      maxTime: NOW_SEC + 3600,
    });
  });

  it('accepts an expiry exactly one minute away', () => {
    expect(getInvoiceTimeBounds(expiryIn(MIN_PAYMENT_WINDOW_SECONDS), NOW_MS)).toEqual({
      ok: true,
      maxTime: NOW_SEC + MIN_PAYMENT_WINDOW_SECONDS,
    });
  });

  it('refuses an expiry under one minute away', () => {
    expect(getInvoiceTimeBounds(expiryIn(MIN_PAYMENT_WINDOW_SECONDS - 1), NOW_MS)).toEqual({
      ok: false,
      message: EXPIRING_SOON_MESSAGE,
    });
  });

  it('refuses an expiry in the past', () => {
    expect(getInvoiceTimeBounds(expiryIn(-10), NOW_MS).ok).toBe(false);
  });

  it('refuses an unparseable expiry', () => {
    expect(getInvoiceTimeBounds('not a date', NOW_MS).ok).toBe(false);
    expect(toUnixSeconds('not a date')).toBeUndefined();
  });
});
