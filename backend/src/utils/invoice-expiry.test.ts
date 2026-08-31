/**
 * invoice-expiry.test.ts
 *
 * Unit tests for the expiry decision and the periodic sweep (issue #559).
 * No Express, no Horizon, no timers left running.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  EXPIRY_SWEEP_INTERVAL_MS,
  assertInvoiceSettleable,
  isInvoiceExpired,
  runExpirySweep,
  startExpirySweep,
} from './invoice-expiry';
import { VerifyErrorCode } from './verify-errors';

const NOW = Date.parse('2026-01-01T00:00:00.000Z');

function invoice(overrides: { status?: string; expiresAt?: Date | string } = {}) {
  return {
    status: 'PENDING',
    expiresAt: new Date(NOW + 60_000),
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('isInvoiceExpired', () => {
  it('is false before the expiry instant', () => {
    expect(isInvoiceExpired(invoice({ expiresAt: new Date(NOW + 1) }), NOW)).toBe(false);
  });

  it('is false at exactly the expiry instant', () => {
    // The storage sweep uses `expiresAt < now`, so the stated instant is still
    // settleable; verify must agree or the two disagree at the boundary.
    expect(isInvoiceExpired(invoice({ expiresAt: new Date(NOW) }), NOW)).toBe(false);
  });

  it('is true one millisecond after the expiry instant', () => {
    expect(isInvoiceExpired(invoice({ expiresAt: new Date(NOW - 1) }), NOW)).toBe(true);
  });

  it('accepts an ISO string as well as a Date', () => {
    expect(isInvoiceExpired(invoice({ expiresAt: new Date(NOW - 1).toISOString() }), NOW)).toBe(
      true,
    );
    expect(isInvoiceExpired(invoice({ expiresAt: new Date(NOW + 1).toISOString() }), NOW)).toBe(
      false,
    );
  });

  it('does not expire an invoice whose expiry cannot be read', () => {
    // Guessing would reject a payment the payer already made.
    expect(isInvoiceExpired(invoice({ expiresAt: 'not-a-date' }), NOW)).toBe(false);
  });
});

describe('assertInvoiceSettleable', () => {
  it('allows a pending invoice inside its window', () => {
    expect(assertInvoiceSettleable(invoice(), NOW)).toEqual({ ok: true });
  });

  it('rejects a past-due invoice with INVOICE_EXPIRED', () => {
    expect(assertInvoiceSettleable(invoice({ expiresAt: new Date(NOW - 1) }), NOW)).toEqual({
      ok: false,
      code: VerifyErrorCode.INVOICE_EXPIRED,
    });
  });

  it('rejects an already-swept invoice with INVOICE_EXPIRED, not NOT_PENDING', () => {
    // Same answer whether or not the sweep has run yet, so the response does
    // not depend on sweep timing.
    expect(
      assertInvoiceSettleable({ status: 'EXPIRED', expiresAt: new Date(NOW - 1) }, NOW),
    ).toEqual({ ok: false, code: VerifyErrorCode.INVOICE_EXPIRED });
  });

  it('rejects other non-pending statuses with INVOICE_NOT_PENDING', () => {
    for (const status of ['PAID', 'CANCELLED']) {
      expect(assertInvoiceSettleable(invoice({ status }), NOW)).toEqual({
        ok: false,
        code: VerifyErrorCode.INVOICE_NOT_PENDING,
      });
    }
  });
});

describe('startExpirySweep', () => {
  it('mirrors the payment monitor cadence', () => {
    expect(EXPIRY_SWEEP_INTERVAL_MS).toBe(60_000);
  });

  it('sweeps repeatedly on the interval and stops when told to', () => {
    vi.useFakeTimers();
    const markExpiredInvoices = vi.fn().mockResolvedValue(0);

    const stop = startExpirySweep({ markExpiredInvoices }, 1_000);
    expect(markExpiredInvoices).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3_000);
    expect(markExpiredInvoices).toHaveBeenCalledTimes(3);

    stop();
    vi.advanceTimersByTime(5_000);
    expect(markExpiredInvoices).toHaveBeenCalledTimes(3);
  });

  it('does not hold the process open', () => {
    vi.useFakeTimers();
    const unref = vi.fn();
    const setIntervalSpy = vi
      .spyOn(globalThis, 'setInterval')
      .mockReturnValue({ unref } as unknown as NodeJS.Timeout);

    startExpirySweep({ markExpiredInvoices: vi.fn() });

    expect(unref).toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });
});

describe('runExpirySweep', () => {
  it('returns how many invoices were swept', async () => {
    await expect(runExpirySweep({ markExpiredInvoices: () => 4 })).resolves.toBe(4);
  });

  it('swallows a failing sweep so a background timer cannot kill the server', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      runExpirySweep({
        markExpiredInvoices: () => Promise.reject(new Error('storage down')),
      }),
    ).resolves.toBe(0);

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
