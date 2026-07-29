import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeMemo, isMemoEmpty, memosMatch } from './memo-normalize';

describe('normalizeMemo', () => {
  it('returns trimmed string', () => {
    assert.strictEqual(normalizeMemo('  INV-ABC-123  '), 'INV-ABC-123');
  });

  it('returns identity when already clean', () => {
    assert.strictEqual(normalizeMemo('INV-ABC-123'), 'INV-ABC-123');
  });

  it('trims leading whitespace only', () => {
    assert.strictEqual(normalizeMemo('  INV-ABC'), 'INV-ABC');
  });

  it('trims trailing whitespace only', () => {
    assert.strictEqual(normalizeMemo('INV-ABC  '), 'INV-ABC');
  });

  it('trims tabs and newlines', () => {
    assert.strictEqual(normalizeMemo('\tINV-ABC\n'), 'INV-ABC');
  });

  it('returns empty string for null', () => {
    assert.strictEqual(normalizeMemo(null), '');
  });

  it('returns empty string for undefined', () => {
    assert.strictEqual(normalizeMemo(undefined), '');
  });

  it('returns empty string for empty string', () => {
    assert.strictEqual(normalizeMemo(''), '');
  });

  it('returns empty string for whitespace-only', () => {
    assert.strictEqual(normalizeMemo('   '), '');
  });
});

describe('isMemoEmpty', () => {
  it('returns true for null', () => {
    assert.strictEqual(isMemoEmpty(null), true);
  });

  it('returns true for undefined', () => {
    assert.strictEqual(isMemoEmpty(undefined), true);
  });

  it('returns true for empty string', () => {
    assert.strictEqual(isMemoEmpty(''), true);
  });

  it('returns true for whitespace-only', () => {
    assert.strictEqual(isMemoEmpty('   '), true);
  });

  it('returns false for a real memo', () => {
    assert.strictEqual(isMemoEmpty('INV-ABC-123'), false);
  });

  it('returns false for memo with surrounding whitespace', () => {
    assert.strictEqual(isMemoEmpty('  INV-ABC  '), false);
  });
});

describe('memosMatch', () => {
  it('matches identical strings', () => {
    assert.strictEqual(memosMatch('INV-ABC-123', 'INV-ABC-123'), true);
  });

  it('matches strings differing only by whitespace', () => {
    assert.strictEqual(memosMatch('  INV-ABC-123', 'INV-ABC-123  '), true);
  });

  it('matches strings with internal whitespace (not trimmed)', () => {
    assert.strictEqual(memosMatch('INV-ABC-123', 'INV-ABC-123'), true);
  });

  it('rejects different strings', () => {
    assert.strictEqual(memosMatch('INV-ABC-123', 'INV-ABC-999'), false);
  });

  it('treats null and undefined as empty match', () => {
    assert.strictEqual(memosMatch(null, undefined), true);
  });

  it('treats null and empty string as match', () => {
    assert.strictEqual(memosMatch(null, ''), true);
  });

  it('treats null and whitespace as match', () => {
    assert.strictEqual(memosMatch(null, '   '), true);
  });

  it('rejects non-empty vs empty', () => {
    assert.strictEqual(memosMatch('INV-ABC', null), false);
  });

  it('rejects non-empty vs whitespace', () => {
    assert.strictEqual(memosMatch('INV-ABC', '   '), false);
  });
});
