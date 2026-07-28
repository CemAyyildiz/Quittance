import { describe, it, expect } from 'vitest';
import { parseCorsOrigin } from '../cors-origin';

describe('parseCorsOrigin', () => {
  it('returns fallback when raw is undefined', () => {
    expect(parseCorsOrigin(undefined)).toEqual(['http://localhost:3000']);
  });

  it('returns fallback when raw is empty string', () => {
    expect(parseCorsOrigin('')).toEqual(['http://localhost:3000']);
  });

  it('returns fallback when raw is whitespace', () => {
    expect(parseCorsOrigin('   ')).toEqual(['http://localhost:3000']);
  });

  it('accepts custom fallback', () => {
    expect(parseCorsOrigin(undefined, '*')).toEqual(['*']);
  });

  it('parses a single URL', () => {
    expect(parseCorsOrigin('http://localhost:3000')).toEqual(['http://localhost:3000']);
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

  it('filters out empty items in a ragged list', () => {
    const raw = 'http://localhost:3000,,https://app.example.com,';
    expect(parseCorsOrigin(raw)).toEqual([
      'http://localhost:3000',
      'https://app.example.com',
    ]);
  });

  it('handles a list with trailing comma', () => {
    expect(parseCorsOrigin('http://localhost:3000,')).toEqual(['http://localhost:3000']);
  });

  it('handles a list with leading comma', () => {
    expect(parseCorsOrigin(',http://localhost:3000')).toEqual(['http://localhost:3000']);
  });
});