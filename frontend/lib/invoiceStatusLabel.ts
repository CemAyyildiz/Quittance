/**
 * invoiceStatusLabel — Map invoice status codes to English UI labels.
 *
 * This is a pure, additive helper that returns a human-readable label
 * for each invoice status. It handles the four canonical statuses:
 * `'PENDING'`, `'PAID'`, `'EXPIRED'`, and `'CANCELLED'` (also accepts US spelling `'CANCELED'`). Unknown
 * inputs return the fallback label `'Unknown'`.
 *
 * The input is normalised by trimming whitespace and lower-casing so
 * that callers can pass statuses in any casing the backend may return
 * (e.g. `"PENDING"`, `"paid"`, `" Expired "`).
 *
 * This module is intentionally not wired into hot paths (pay page,
 * export, PaymentReceipt, etc.). Callers opt in by importing the
 * function and rendering the returned label however they like.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The canonical invoice statuses used across the backend and frontend. */
export type InvoiceStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Lookup map — lower-cased status → English label. */
const STATUS_LABELS: Readonly<Record<string, string>> = {
  pending: 'Pending',
  paid: 'Paid',
  expired: 'Expired',
  cancelled: 'Cancelled',
  // US spelling variant sometimes seen in JSON payloads
  canceled: 'Cancelled',
};

/** Fallback label returned for any unrecognised or invalid input. */
const FALLBACK_LABEL = 'Unknown';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Map any invoice status code to an English UI label.
 *
 * Accepts case-insensitive strings, with surrounding whitespace
 * tolerated. Non-string inputs and codes not in the known set
 * return `'Unknown'`.
 *
 * @param status - The invoice status code (e.g. `"PENDING"`, `"paid"`).
 * @returns A human-readable label (e.g. `"Pending"`, `"Paid"`).
 *
 * @example
 * invoiceStatusLabel('PENDING')   // "Pending"
 * invoiceStatusLabel('paid')      // "Paid"
 * invoiceStatusLabel(' EXPIRED ') // "Expired"
 * invoiceStatusLabel('CANCELLED') // "Cancelled"
 * invoiceStatusLabel('UNKNOWN')   // "Unknown"
 * invoiceStatusLabel('')          // "Unknown"
 * invoiceStatusLabel(null)        // "Unknown"
 */
export function invoiceStatusLabel(status: unknown): string {
  if (typeof status !== 'string') return FALLBACK_LABEL;

  const normalized = status.trim().toLowerCase();
  return STATUS_LABELS[normalized] ?? FALLBACK_LABEL;
}

/**
 * Type-safe variant that restricts the input to the canonical
 * `InvoiceStatus` union. Useful when the caller already holds a
 * typed value and wants compile-time safety.
 *
 * @param status - A known `InvoiceStatus` literal.
 * @returns The corresponding English label.
 *
 * @example
 * invoiceStatusLabelSafe('PENDING') // "Pending"
 * // invoiceStatusLabelSafe('INVALID') // TypeScript error
 */
export function invoiceStatusLabelSafe(status: InvoiceStatus): string {
  // The lookup is guaranteed to succeed for canonical statuses.
  return STATUS_LABELS[status.toLowerCase()]!;
}


/**
 * Returns true when `status` maps to a known invoice label
 * (including the US spelling alias `canceled`).
 */
export function isKnownInvoiceStatus(status: unknown): boolean {
  if (typeof status !== 'string') return false;
  const normalized = status.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(STATUS_LABELS, normalized);
}

export default invoiceStatusLabel;
