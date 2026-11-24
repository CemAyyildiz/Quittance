import { describe, it, expect } from 'vitest';
import { getInvoiceReminder, mailtoProof } from './mailtoProof';

describe('mailtoProof', () => {
  it('returns mailto URL for valid inputs', () => {
    const url = mailtoProof('alice@example.com', 'Invoice #123', 'Please pay here');
    expect(url).toBe('mailto:alice@example.com?subject=Invoice%20%23123&body=Please%20pay%20here');
  });

  it('URI-encodes special characters in subject and body', () => {
    const url = mailtoProof('bob@test.org', 'Hello & welcome!', 'Amount: $50\nThanks');
    expect(url).toMatch(/^mailto:bob@test\.org\?subject=Hello%20%26%20welcome!/);
    expect(url).toContain('Amount%3A%20%2450');
    expect(url).toContain('Thanks');
  });

  it('returns valid URL when subject is empty', () => {
    const url = mailtoProof('carol@example.com', '', 'Just a note');
    expect(url).toBe('mailto:carol@example.com?body=Just%20a%20note');
  });

  it('returns valid URL when body is empty', () => {
    const url = mailtoProof('dave@example.com', 'Greetings', '');
    expect(url).toBe('mailto:dave@example.com?subject=Greetings');
  });

  it('returns mailto with only recipient when subject and body are empty', () => {
    const url = mailtoProof('eve@example.com', '', '');
    expect(url).toBe('mailto:eve@example.com');
  });

  it('returns empty string for empty email', () => {
    expect(mailtoProof('', 'Subject', 'Body')).toBe('');
  });

  it('returns empty string for whitespace-only email', () => {
    expect(mailtoProof('   ', 'Subject', 'Body')).toBe('');
  });

  it('trims whitespace from email', () => {
    const url = mailtoProof('  frank@example.com  ', 'Hi', 'Hello');
    expect(url).toBe('mailto:frank@example.com?subject=Hi&body=Hello');
  });

  it('percent-encodes a newline in the subject', () => {
    const url = mailtoProof('grace@example.com', 'Line1\nLine2', 'Body');
    expect(url).toBe('mailto:grace@example.com?subject=Line1%0ALine2&body=Body');
    expect(url).not.toContain('\n');
  });
});

describe('getInvoiceReminder', () => {
  const now = Date.parse('2026-11-24T12:00:00.000Z');
  const baseInvoice = {
    id: 'inv-24h',
    status: 'PENDING',
    amount: 42,
    assetCode: 'XLM',
    customerEmail: 'client@example.com',
    description: 'Design & development',
    expiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
  };

  it('offers an encoded mailto at the inclusive 24-hour boundary', () => {
    const result = getInvoiceReminder(baseInvoice, 'https://quittance.test/pay/inv-24h', now);

    expect(result.dueSoon).toBe(true);
    expect(result.mailto).toContain('mailto:client@example.com?');
    expect(result.mailto).toContain('Design%20%26%20development');
    expect(result.mailto).toContain('42%20XLM');
    expect(result.mailto).toContain('https%3A%2F%2Fquittance.test%2Fpay%2Finv-24h');
  });

  it('does not mark a pending invoice outside the 24-hour window', () => {
    const result = getInvoiceReminder(
      { ...baseInvoice, expiresAt: new Date(now + 24 * 60 * 60 * 1000 + 1).toISOString() },
      'https://quittance.test/pay/inv-24h',
      now,
    );

    expect(result).toEqual({ dueSoon: false, mailto: '' });
  });

  it('keeps the warning but omits mailto when customer email is missing', () => {
    const result = getInvoiceReminder(
      { ...baseInvoice, customerEmail: undefined },
      'https://quittance.test/pay/inv-24h',
      now,
    );

    expect(result).toEqual({ dueSoon: true, mailto: '' });
  });

  it.each(['PAID', 'CANCELLED', 'EXPIRED'])('does not remind a %s invoice', (status) => {
    expect(
      getInvoiceReminder({ ...baseInvoice, status }, 'https://quittance.test/pay/inv-24h', now),
    ).toEqual({ dueSoon: false, mailto: '' });
  });

  it('does not remind an already expired pending invoice', () => {
    expect(
      getInvoiceReminder(
        { ...baseInvoice, expiresAt: new Date(now - 1).toISOString() },
        'https://quittance.test/pay/inv-24h',
        now,
      ),
    ).toEqual({ dueSoon: false, mailto: '' });
  });
});
