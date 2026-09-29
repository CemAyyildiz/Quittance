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

  // The fallback is a full CORS value, so it is split and trimmed exactly like
  // a raw list. Lock that a multi-origin fallback still yields two entries.
  it('splits a comma-separated fallback into two trimmed origins when raw is undefined', () => {
    expect(parseCorsOrigin(undefined, 'https://pay.example, https://app.example')).toEqual([
      'https://pay.example',
      'https://app.example',
    ]);
  });

  it('splits a comma-separated fallback into two trimmed origins when raw is whitespace', () => {
    expect(parseCorsOrigin('   ', 'https://pay.example, https://app.example')).toEqual([
      'https://pay.example',
      'https://app.example',
    ]);
  });

  it('splits a comma-separated fallback into two trimmed origins when raw is an empty string', () => {
    expect(parseCorsOrigin('', 'https://pay.example, https://app.example')).toEqual([
      'https://pay.example',
      'https://app.example',
    ]);
  });

  it('trims each origin of a padded comma-separated fallback', () => {
    expect(parseCorsOrigin(undefined, '  https://pay.example  ,  https://app.example  ')).toEqual([
      'https://pay.example',
      'https://app.example',
    ]);
  });

  it('splits a three-origin fallback into three entries when raw is undefined', () => {
    expect(parseCorsOrigin(undefined, 'https://a.example,https://b.example, https://c.example')).toEqual([
      'https://a.example',
      'https://b.example',
      'https://c.example',
    ]);
  });

  it('filters empty segments out of a ragged comma-separated fallback', () => {
    expect(parseCorsOrigin(undefined, 'https://pay.example,,  ,https://app.example,')).toEqual([
      'https://pay.example',
      'https://app.example',
    ]);
  });

  it('does not let a multi-origin fallback collapse back into a single string', () => {
    expect(parseCorsOrigin(undefined, 'https://pay.example, https://app.example')).toHaveLength(2);
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
