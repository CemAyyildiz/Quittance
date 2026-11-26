/**
 * invoice-expiry.ts
 *
 * Invoice expiry for the MVP demo backend (issue #559).
 *
 * Storage already knows how to transition a past-due `PENDING` invoice to
 * `EXPIRED` (`markExpiredInvoices`), but the MVP server never ran it, so an
 * invoice stayed `PENDING` forever and Horizon-matched payments settled stale
 * invoices. The Postgres path sweeps periodically in
 * `payment-monitor.service.ts`; this module gives the MVP path the same sweep
 * and, separately, the settlement decision that verify makes.
 *
 * Kept HTTP-free so both can be unit-tested without Express or Horizon.
 */

import { VerifyErrorCode } from './verify-errors';

/** How often the MVP sweep runs, mirroring `payment-monitor.service.ts`. */
export const EXPIRY_SWEEP_INTERVAL_MS = 60_000;

/** The invoice fields expiry cares about. */
export interface ExpirableInvoice {
  status: string;
  expiresAt: Date | string;
}

export type SettleabilityResult =
  | { ok: true }
  | { ok: false; code: VerifyErrorCode };

/** Anything exposing the storage sweep; narrowed so tests need no service. */
export interface ExpirySweeper {
  markExpiredInvoices(): Promise<number> | number;
}

function expiresAtMs(invoice: ExpirableInvoice): number {
  return invoice.expiresAt instanceof Date
    ? invoice.expiresAt.getTime()
    : new Date(invoice.expiresAt).getTime();
}

/**
 * Whether a requested expiry is strictly in the future at `now`.
 *
 * Used when an invoice is created with an explicit `expiresAt`: an expiry at
 * or before the current instant would make the invoice unpayable the moment
 * it is shared. Instants are compared in UTC, so the server clock decides,
 * not the client's local offset. An unreadable value is not future.
 */
export function isFutureExpiry(
  expiresAt: Date | string,
  now: number = Date.now(),
): boolean {
  const expiry = toDateMs(expiresAt);
  return Number.isFinite(expiry) && expiry > now;
}

/**
 * Whether an invoice is past its settlement window at `now`.
 *
 * The comparison is strict, matching `markExpiredInvoices`: an invoice is
 * expired once `expiresAt` is in the past, so an invoice verified at exactly
 * `expiresAt` is still settleable. An unparseable `expiresAt` is treated as
 * *not* expired, because guessing would reject a payment the payer already
 * made — the sweep and the storage layer own that data, and a bad value there
 * is a bug to fix rather than a reason to refuse settlement.
 */
export function isInvoiceExpired(invoice: ExpirableInvoice, now: number = Date.now()): boolean {
  const expiry = expiresAtMs(invoice);
  return Number.isFinite(expiry) && expiry < now;
}

/**
 * The decision `POST /api/invoices/:id/verify` makes before it talks to
 * Horizon.
 *
 * Expiry is reported ahead of the pending check, and deliberately so: once the
 * sweep has run, a past-due invoice is `EXPIRED`, and a bare "not pending"
 * would tell the payer nothing about *why*. An invoice that is past due but
 * has not been swept yet reaches the same answer, so the response does not
 * depend on sweep timing.
 */
export function assertInvoiceSettleable(
  invoice: ExpirableInvoice,
  now: number = Date.now(),
): SettleabilityResult {
  if (invoice.status === 'EXPIRED' || isInvoiceExpired(invoice, now)) {
    return { ok: false, code: VerifyErrorCode.INVOICE_EXPIRED };
  }

  if (invoice.status !== 'PENDING') {
    return { ok: false, code: VerifyErrorCode.INVOICE_NOT_PENDING };
  }

  return { ok: true };
}

/**
 * Starts the periodic sweep and returns a function that stops it.
 *
 * The timer is `unref`d so it never holds the process open — a demo backend
 * should not outlive its own shutdown because of a housekeeping interval — and
 * a failing sweep is logged rather than thrown, since an unhandled rejection in
 * a background timer would take the server down over stale demo data.
 */
export function startExpirySweep(
  sweeper: ExpirySweeper,
  intervalMs: number = EXPIRY_SWEEP_INTERVAL_MS,
): () => void {
  const timer = setInterval(() => {
    void runExpirySweep(sweeper);
  }, intervalMs);

  timer.unref?.();

  return () => clearInterval(timer);
}

/** Runs one sweep, swallowing and logging failures. Returns the count swept. */
export async function runExpirySweep(sweeper: ExpirySweeper): Promise<number> {
  try {
    return await sweeper.markExpiredInvoices();
  } catch (error) {
    console.error('Invoice expiry sweep failed:', error);
    return 0;
  }
}

/** Max how far past the *original* expiry a single extension may push. */
export const MAX_EXPIRY_EXTENSION_DAYS = 30;
export const MAX_EXPIRY_EXTENSION_MS = MAX_EXPIRY_EXTENSION_DAYS * 24 * 60 * 60 * 1000;

export type ExtendExpiryRejectCode =
  | 'NOT_OWNER'
  | 'NOT_EXTENDABLE'
  | 'ALREADY_EXTENDED'
  | 'INVALID_EXPIRY'
  | 'NEW_EXPIRY_NOT_AFTER_OLD'
  | 'EXTENSION_BEYOND_MAX';

/** Invoice fields the one-time seller extension cares about. */
export interface ExtendableInvoice {
  status: string;
  expiresAt: Date | string;
  sellerPublicKey: string;
  originalExpiresAt?: Date | string | null;
  expiryExtended?: boolean;
}

export type ExtendExpiryDecision =
  | {
      ok: true;
      originalExpiresAt: Date;
      newExpiresAt: Date;
      reviveToPending: boolean;
    }
  | { ok: false; code: ExtendExpiryRejectCode; error: string };

function toDateMs(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/**
 * Pure decision for `POST /api/invoices/:id/extend-expiry`.
 *
 * The owning seller may push `expiresAt` later exactly once while the invoice
 * is still unpaid and either `PENDING` or `EXPIRED`. The new instant must be
 * strictly after the current expiry and no more than 30 days past the
 * original. Paid and cancelled (voided) invoices are rejected; extending an
 * expired invoice may revive it to `PENDING`, but never a voided one.
 */
export function assertCanExtendExpiry(
  invoice: ExtendableInvoice,
  sellerPublicKey: string,
  newExpiresAt: Date | string,
): ExtendExpiryDecision {
  if (sellerPublicKey !== invoice.sellerPublicKey) {
    return {
      ok: false,
      code: 'NOT_OWNER',
      error: 'Only the owning seller can extend this invoice',
    };
  }

  if (invoice.status === 'PAID') {
    return {
      ok: false,
      code: 'NOT_EXTENDABLE',
      error: 'A paid invoice cannot be extended',
    };
  }

  if (invoice.status === 'CANCELLED') {
    return {
      ok: false,
      code: 'NOT_EXTENDABLE',
      error: 'A voided invoice cannot be extended',
    };
  }

  if (invoice.status !== 'PENDING' && invoice.status !== 'EXPIRED') {
    return {
      ok: false,
      code: 'NOT_EXTENDABLE',
      error: 'Invoice is not pending or expired',
    };
  }

  if (invoice.expiryExtended) {
    return {
      ok: false,
      code: 'ALREADY_EXTENDED',
      error: 'Invoice expiry has already been extended once',
    };
  }

  const newMs = toDateMs(newExpiresAt);
  if (!Number.isFinite(newMs)) {
    return {
      ok: false,
      code: 'INVALID_EXPIRY',
      error: 'expiresAt must be a valid date',
    };
  }

  const currentMs = toDateMs(invoice.expiresAt);
  if (!Number.isFinite(currentMs)) {
    return {
      ok: false,
      code: 'INVALID_EXPIRY',
      error: 'Current invoice expiry is unreadable',
    };
  }

  if (newMs <= currentMs) {
    return {
      ok: false,
      code: 'NEW_EXPIRY_NOT_AFTER_OLD',
      error: 'New expiry must be strictly later than the current expiry',
    };
  }

  const originalSource = invoice.originalExpiresAt ?? invoice.expiresAt;
  const originalMs = toDateMs(originalSource);
  if (!Number.isFinite(originalMs)) {
    return {
      ok: false,
      code: 'INVALID_EXPIRY',
      error: 'Original invoice expiry is unreadable',
    };
  }

  if (newMs > originalMs + MAX_EXPIRY_EXTENSION_MS) {
    return {
      ok: false,
      code: 'EXTENSION_BEYOND_MAX',
      error: `New expiry cannot be more than ${MAX_EXPIRY_EXTENSION_DAYS} days past the original expiry`,
    };
  }

  return {
    ok: true,
    originalExpiresAt: new Date(originalMs),
    newExpiresAt: new Date(newMs),
    reviveToPending: invoice.status === 'EXPIRED',
  };
}
