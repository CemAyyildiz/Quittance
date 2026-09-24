import { describe, it, expect } from 'vitest';
import { normalizeMemo, isMemoEmpty, memosMatch } from './memo-normalize';

describe('normalizeMemo', () => {
  it('returns trimmed string', () => {
    expect(normalizeMemo('  INV-ABC-123  ')).toBe('INV-ABC-123');
  });

  it('returns identity when already clean', () => {
    expect(normalizeMemo('INV-ABC-123')).toBe('INV-ABC-123');
  });

  it('trims leading whitespace only', () => {
    expect(normalizeMemo('  INV-ABC')).toBe('INV-ABC');
  });

  it('trims trailing whitespace only', () => {
    expect(normalizeMemo('INV-ABC  ')).toBe('INV-ABC');
  });

  it('trims tabs and newlines', () => {
    expect(normalizeMemo('\tINV-ABC\n')).toBe('INV-ABC');
  });

  it('returns empty string for null', () => {
    expect(normalizeMemo(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(normalizeMemo(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(normalizeMemo('')).toBe('');
  });

  it('returns empty string for whitespace-only', () => {
    expect(normalizeMemo('   ')).toBe('');
  });
});

describe('isMemoEmpty', () => {
  it('returns true for null', () => {
    expect(isMemoEmpty(null)).toBe(true);
  });

  it('returns true for undefined', () => {
    expect(isMemoEmpty(undefined)).toBe(true);
  });

  it('returns true for empty string', () => {
    expect(isMemoEmpty('')).toBe(true);
  });

  it('returns true for whitespace-only', () => {
    expect(isMemoEmpty('   ')).toBe(true);
  });

  it('returns false for a real memo', () => {
    expect(isMemoEmpty('INV-ABC-123')).toBe(false);
  });

  it('returns false for memo with surrounding whitespace', () => {
    expect(isMemoEmpty('  INV-ABC  ')).toBe(false);
  });
});

describe('memosMatch', () => {
  it('matches identical strings', () => {
    expect(memosMatch('INV-ABC-123', 'INV-ABC-123')).toBe(true);
  });

  it('matches strings differing only by whitespace', () => {
    expect(memosMatch('  INV-ABC-123', 'INV-ABC-123  ')).toBe(true);
  });

  it('matches strings with internal whitespace (not trimmed)', () => {
    expect(memosMatch('INV-ABC-123', 'INV-ABC-123')).toBe(true);
  });

  it('rejects different strings', () => {
    expect(memosMatch('INV-ABC-123', 'INV-ABC-999')).toBe(false);
  });

  it('treats null and undefined as empty match', () => {
    expect(memosMatch(null, undefined)).toBe(true);
  });

  it('treats null and empty string as match', () => {
    expect(memosMatch(null, '')).toBe(true);
  });

  it('treats null and whitespace as match', () => {
    expect(memosMatch(null, '   ')).toBe(true);
  });

  it('rejects non-empty vs empty', () => {
    expect(memosMatch('INV-ABC', null)).toBe(false);
  });

  it('rejects non-empty vs whitespace', () => {
    expect(memosMatch('INV-ABC', '   ')).toBe(false);
  });
});
