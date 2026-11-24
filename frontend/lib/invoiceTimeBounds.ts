/**
 * invoiceTimeBounds.ts
 *
 * Time bounds for invoice payments. A signed payment transaction can be held
 * and submitted later, so it is bound to the invoice expiry (`maxTime`) and
 * cannot settle an invoice after it expired.
 */

/** Shortest remaining window in which a Freighter payment is still attempted. */
export const MIN_PAYMENT_WINDOW_SECONDS = 60;

export const EXPIRING_SOON_MESSAGE =
  'This invoice is about to expire. Ask the seller for a new invoice.';

export type InvoiceTimeBoundsResult =
  | { ok: true; maxTime: number }
  | { ok: false; message: string };

/** Unix seconds (floored) of an invoice expiry, or `undefined` if unparseable. */
export function toUnixSeconds(expiresAt: Date | string | number): number | undefined {
  const ms = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : undefined;
}

/**
 * The `maxTime` to put on a payment transaction, or a refusal when the invoice
 * has less than a minute left.
 */
export function getInvoiceTimeBounds(
  expiresAt: Date | string | number,
  nowMs: number = Date.now(),
): InvoiceTimeBoundsResult {
  const maxTime = toUnixSeconds(expiresAt);
  if (maxTime === undefined) {
    return { ok: false, message: 'This invoice has an invalid expiry date.' };
  }
  if (maxTime - Math.floor(nowMs / 1000) < MIN_PAYMENT_WINDOW_SECONDS) {
    return { ok: false, message: EXPIRING_SOON_MESSAGE };
  }
  return { ok: true, maxTime };
}
