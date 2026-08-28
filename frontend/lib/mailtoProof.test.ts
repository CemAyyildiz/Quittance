import { describe, it, expect } from 'vitest';
import { mailtoProof } from './mailtoProof';

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
});
