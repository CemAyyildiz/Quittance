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
