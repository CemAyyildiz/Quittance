import { describe, it, expect } from 'vitest';
import { parseCorsOrigin } from './cors-origin';

describe('parseCorsOrigin', () => {
  it('returns fallback when input is undefined', () => {
    expect(parseCorsOrigin(undefined)).toEqual(['http://localhost:3000']);
  });

  it('returns custom fallback when input is undefined and fallback provided', () => {
    expect(parseCorsOrigin(undefined, 'https://fallback.com')).toEqual(['https://fallback.com']);
  });

  it('returns fallback when input is an empty string', () => {
    expect(parseCorsOrigin('')).toEqual(['http://localhost:3000']);
  });

  it('returns fallback when input is only whitespace', () => {
    expect(parseCorsOrigin('   ')).toEqual(['http://localhost:3000']);
  });

  it('parses a single origin correctly', () => {
    expect(parseCorsOrigin('https://example.com')).toEqual(['https://example.com']);
  });

  it('parses a comma-separated list of origins correctly', () => {
    expect(parseCorsOrigin('https://a.com,https://b.com')).toEqual(['https://a.com', 'https://b.com']);
  });

  it('handles spaces within a comma-separated list', () => {
    expect(parseCorsOrigin('https://a.com, https://b.com ,  https://c.com')).toEqual([
      'https://a.com',
      'https://b.com',
      'https://c.com',
    ]);
  });

  it('filters out empty segments in a list', () => {
    expect(parseCorsOrigin('https://a.com,,https://b.com, ')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('returns fallback when input resolves to empty after filtering (e.g. malformed input)', () => {
    expect(parseCorsOrigin(',, , ')).toEqual(['http://localhost:3000']);
  });
});
