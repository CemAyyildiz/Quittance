/**
 * invoice-expiry.test.ts
 *
 * Unit tests for the expiry decision and the periodic sweep (issue #559).
 * No Express, no Horizon, no timers left running.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  EXPIRY_SWEEP_INTERVAL_MS,
  MAX_EXPIRY_EXTENSION_MS,
  assertCanExtendExpiry,
  assertInvoiceSettleable,
  isInvoiceExpired,
  runExpirySweep,
  startExpirySweep,
} from './invoice-expiry';
import { VerifyErrorCode } from './verify-errors';

const NOW = Date.parse('2026-01-01T00:00:00.000Z');
const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const OTHER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

function invoice(overrides: { status?: string; expiresAt?: Date | string } = {}) {
  return {
    status: 'PENDING',
    expiresAt: new Date(NOW + 60_000),
    ...overrides,
  };
}

function extendable(
  overrides: Partial<{
    status: string;
    expiresAt: Date | string;
    sellerPublicKey: string;
    originalExpiresAt: Date | string;
    expiryExtended: boolean;
  }> = {},
) {
  const expiresAt = overrides.expiresAt ?? new Date(NOW + 7 * 24 * 60 * 60 * 1000);
  return {
    status: 'PENDING',
    sellerPublicKey: SELLER,
    expiresAt,
    originalExpiresAt: expiresAt,
    expiryExtended: false,
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

  it('allows a pending invoice with an unreadable expiresAt', () => {
    // Unparseable expiry is treated as not expired, so settlement proceeds.
    expect(assertInvoiceSettleable(invoice({ expiresAt: 'not-a-date' }), NOW)).toEqual({
      ok: true,
    });
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

describe('assertCanExtendExpiry', () => {
  const current = new Date(NOW + 7 * 24 * 60 * 60 * 1000);
  const later = new Date(current.getTime() + 3 * 24 * 60 * 60 * 1000);

  it('allows the first extension to a later date within the 30-day cap', () => {
    const result = assertCanExtendExpiry(extendable({ expiresAt: current }), SELLER, later);

    expect(result).toEqual({
      ok: true,
      originalExpiresAt: current,
      newExpiresAt: later,
      reviveToPending: false,
    });
  });

  it('rejects a second extension', () => {
    expect(
      assertCanExtendExpiry(
        extendable({ expiresAt: current, expiryExtended: true }),
        SELLER,
        later,
      ),
    ).toMatchObject({ ok: false, code: 'ALREADY_EXTENDED' });
  });

  it('rejects a shorter or equal new expiry', () => {
    expect(
      assertCanExtendExpiry(extendable({ expiresAt: current }), SELLER, current),
    ).toMatchObject({ ok: false, code: 'NEW_EXPIRY_NOT_AFTER_OLD' });

    expect(
      assertCanExtendExpiry(
        extendable({ expiresAt: current }),
        SELLER,
        new Date(current.getTime() - 1),
      ),
    ).toMatchObject({ ok: false, code: 'NEW_EXPIRY_NOT_AFTER_OLD' });
  });

  it('rejects a paid invoice', () => {
    expect(
      assertCanExtendExpiry(extendable({ status: 'PAID', expiresAt: current }), SELLER, later),
    ).toMatchObject({ ok: false, code: 'NOT_EXTENDABLE' });
  });

  it('rejects a voided invoice and does not revive it', () => {
    expect(
      assertCanExtendExpiry(
        extendable({ status: 'CANCELLED', expiresAt: current }),
        SELLER,
        later,
      ),
    ).toMatchObject({ ok: false, code: 'NOT_EXTENDABLE' });
  });

  it('allows extending an expired unpaid invoice and marks revive', () => {
    const result = assertCanExtendExpiry(
      extendable({ status: 'EXPIRED', expiresAt: new Date(NOW - 1) }),
      SELLER,
      later,
    );

    expect(result).toMatchObject({ ok: true, reviveToPending: true });
  });

  it('rejects a non-owner', () => {
    expect(
      assertCanExtendExpiry(extendable({ expiresAt: current }), OTHER, later),
    ).toMatchObject({ ok: false, code: 'NOT_OWNER' });
  });

  it('rejects a date more than 30 days past the original expiry', () => {
    const tooFar = new Date(current.getTime() + MAX_EXPIRY_EXTENSION_MS + 1);

    expect(
      assertCanExtendExpiry(extendable({ expiresAt: current }), SELLER, tooFar),
    ).toMatchObject({ ok: false, code: 'EXTENSION_BEYOND_MAX' });
  });

  it('allows a date exactly 30 days past the original expiry', () => {
    const atCap = new Date(current.getTime() + MAX_EXPIRY_EXTENSION_MS);

    expect(assertCanExtendExpiry(extendable({ expiresAt: current }), SELLER, atCap)).toMatchObject({
      ok: true,
    });
  });
});
