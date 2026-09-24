import { describe, it, expect } from 'vitest';
import { isBase64DataUrl, getCopyablePayload } from '../qrPayload';

describe('isBase64DataUrl', () => {
  it('returns true for PNG base64 data URL', () => {
    const value = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    expect(isBase64DataUrl(value)).toBe(true);
  });

  it('returns true for JPEG base64 data URL', () => {
    const value = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    expect(isBase64DataUrl(value)).toBe(true);
  });

  it('returns true for SVG base64 data URL', () => {
    const value = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==';
    expect(isBase64DataUrl(value)).toBe(true);
  });

  it('returns false for a regular payment URL', () => {
    expect(isBase64DataUrl('https://example.com/pay/invoice-123')).toBe(false);
  });

  it('returns false for a SEP-0007 Stellar URI', () => {
    expect(isBase64DataUrl('web+stellar:pay?destination=GABC123&amount=100')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isBase64DataUrl('')).toBe(false);
  });

  it('returns false for a plain text string', () => {
    expect(isBase64DataUrl('just a regular string')).toBe(false);
  });

  it('returns false for a data URL with non-image MIME type', () => {
    expect(isBase64DataUrl('data:text/plain;base64,SGVsbG8=')).toBe(false);
  });
});

describe('getCopyablePayload', () => {
  const fallbackUrl = 'https://example.com/pay/invoice-123';

  it('returns fallback URL when value is a base64 data URL', () => {
    const base64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    expect(getCopyablePayload(base64, fallbackUrl)).toBe(fallbackUrl);
  });

  it('returns empty string when base64 data URL has no fallback', () => {
    const base64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    expect(getCopyablePayload(base64)).toBe('');
  });

  it('returns the value itself when it is a regular payment URL', () => {
    expect(getCopyablePayload(fallbackUrl)).toBe(fallbackUrl);
  });

  it('returns the value itself when it is a SEP-0007 Stellar URI', () => {
    const stellarUri = 'web+stellar:pay?destination=GABC123&amount=100&memo=INV-001&memo_type=MEMO_TEXT';
    expect(getCopyablePayload(stellarUri)).toBe(stellarUri);
  });

  it('returns the value itself when it is a regular HTTP URL', () => {
    const url = 'http://localhost:3000/pay/invoice-456';
    expect(getCopyablePayload(url)).toBe(url);
  });

  it('returns the value itself for arbitrary non-base64 strings', () => {
    expect(getCopyablePayload('some-random-text')).toBe('some-random-text');
  });

  it('returns empty string for empty value', () => {
    expect(getCopyablePayload('')).toBe('');
  });

  it('returns fallback when both value and fallback are empty', () => {
    expect(getCopyablePayload('')).toBe('');
  });

  it('ignores fallback when value is already a usable URL', () => {
    const url = 'https://example.com/pay/abc';
    expect(getCopyablePayload(url, 'https://should-not-use.com')).toBe(url);
  });
});
