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
