/**
 * Build a `mailto:` URL for sending proof or invoice links via the user's
 * default email client.
 *
 * @param to   - Recipient email address.
 * @param subject - Email subject line (will be URI-encoded).
 * @param body    - Email body text (will be URI-encoded).
 *
 * @returns A fully-formed `mailto:` URL string, or an empty string when `to`
 *          is empty / falsy.
 *
 * @example
 * ```ts
 * mailtoProof('alice@example.com', 'Your invoice', 'Pay here: …')
 * // → "mailto:alice@example.com?subject=Your%20invoice&body=Pay%20here%3A%20%E2%80%A6"
 * ```
 */
export function mailtoProof(to: string, subject: string, body: string): string {
  if (!to || to.trim().length === 0) {
    return '';
  }

  const parts: string[] = [];
  if (subject) parts.push(`subject=${encodeURIComponent(subject)}`);
  if (body) parts.push(`body=${encodeURIComponent(body)}`);

  const qs = parts.join('&');
  return `mailto:${to.trim()}${qs ? `?${qs}` : ''}`;
}

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface ReminderInvoice {
  id: string;
  status: string;
  amount: number | string;
  assetCode: string;
  expiresAt: string | Date;
  customerEmail?: string;
  description?: string;
}

export interface InvoiceReminder {
  dueSoon: boolean;
  mailto: string;
}

/**
 * Describe the optional mailto reminder for a pending invoice.
 *
 * The comparison deliberately includes the exact 24-hour boundary and
 * excludes invoices that have already expired, even if their persisted status
 * has not yet been refreshed by the server expiry sweep.
 */
export function getInvoiceReminder(
  invoice: ReminderInvoice,
  paymentUrl: string,
  nowMs = Date.now(),
): InvoiceReminder {
  const expiresAtMs = new Date(invoice.expiresAt).getTime();
  const remainingMs = expiresAtMs - nowMs;
  const dueSoon =
    invoice.status === 'PENDING' &&
    Number.isFinite(expiresAtMs) &&
    remainingMs > 0 &&
    remainingMs <= REMINDER_WINDOW_MS;

  if (!dueSoon || !invoice.customerEmail || !paymentUrl) {
    return { dueSoon, mailto: '' };
  }

  const subject = `Payment reminder for invoice ${invoice.id}`;
  const description = invoice.description ? `For: ${invoice.description}\n` : '';
  const body = [
    `A reminder that invoice ${invoice.id} is due soon.`,
    '',
    description.trimEnd(),
    `Amount: ${invoice.amount} ${invoice.assetCode}`,
    `Expires: ${new Date(expiresAtMs).toISOString()}`,
    `Payment link: ${paymentUrl}`,
  ]
    .filter((line) => line !== '')
    .join('\n');

  return {
    dueSoon,
    mailto: mailtoProof(invoice.customerEmail, subject, body),
  };
}
