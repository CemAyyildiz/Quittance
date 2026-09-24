import { describe, it, expect } from 'vitest';
import { parseCorsOrigin } from '../cors-origin';

describe('parseCorsOrigin', () => {
  it('returns fallback when raw is undefined', () => {
    expect(parseCorsOrigin(undefined)).toEqual(['http://localhost:3000']);
  });

  it('returns custom fallback when raw is undefined', () => {
    expect(parseCorsOrigin(undefined, 'https://fallback.com')).toEqual(['https://fallback.com']);
  });

  it('accepts custom fallback wildcard', () => {
    expect(parseCorsOrigin(undefined, '*')).toEqual(['*']);
  });

  it('returns fallback when raw is empty string', () => {
    expect(parseCorsOrigin('')).toEqual(['http://localhost:3000']);
  });

  it('returns fallback when raw is whitespace', () => {
    expect(parseCorsOrigin('   ')).toEqual(['http://localhost:3000']);
  });

  it('parses a single URL', () => {
    expect(parseCorsOrigin('http://localhost:3000')).toEqual(['http://localhost:3000']);
  });

  it('parses a single origin with https scheme', () => {
    expect(parseCorsOrigin('https://example.com')).toEqual(['https://example.com']);
  });

  it('trims surrounding whitespace from a single URL', () => {
    expect(parseCorsOrigin('  http://localhost:3000  ')).toEqual(['http://localhost:3000']);
  });

  it('parses a comma-separated list of origins', () => {
    const raw = 'http://localhost:3000,https://app.example.com';
    expect(parseCorsOrigin(raw)).toEqual([
      'http://localhost:3000',
      'https://app.example.com',
    ]);
  });

  it('trims whitespace around each item in a list', () => {
    const raw = '  http://localhost:3000 ,  https://app.example.com  ';
    expect(parseCorsOrigin(raw)).toEqual([
      'http://localhost:3000',
      'https://app.example.com',
    ]);
  });

  it('handles spaces within a comma-separated list', () => {
    expect(parseCorsOrigin('https://a.com, https://b.com ,  https://c.com')).toEqual([
      'https://a.com',
      'https://b.com',
      'https://c.com',
    ]);
  });

  it('filters out empty items in a ragged list', () => {
    const raw = 'http://localhost:3000,,https://app.example.com,';
    expect(parseCorsOrigin(raw)).toEqual([
      'http://localhost:3000',
      'https://app.example.com',
    ]);
  });

  it('filters out empty segments with trailing whitespace', () => {
    expect(parseCorsOrigin('https://a.com,,https://b.com, ')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('handles a list with trailing comma', () => {
    expect(parseCorsOrigin('http://localhost:3000,')).toEqual(['http://localhost:3000']);
  });

  it('handles a list with leading comma', () => {
    expect(parseCorsOrigin(',http://localhost:3000')).toEqual(['http://localhost:3000']);
  });

  it('returns fallback when input resolves to empty after filtering', () => {
    expect(parseCorsOrigin(',, , ')).toEqual(['http://localhost:3000']);
  });
});
