import assert from 'node:assert/strict';
import { normalizeMemo } from './memo-normalize';

interface Case {
  name: string;
  input: string | null | undefined;
  expected: string;
}

const cases: Case[] = [
  // trim cases
  { name: 'trims leading whitespace', input: '   INV-X-Y', expected: 'INV-X-Y' },
  { name: 'trims trailing whitespace', input: 'INV-X-Y   ', expected: 'INV-X-Y' },
  { name: 'trims whitespace on both sides', input: '  INV-X-Y  ', expected: 'INV-X-Y' },
  { name: 'trims tabs and newlines', input: '\tINV-X-Y\n', expected: 'INV-X-Y' },
  { name: 'trims non-breaking spaces', input: '\u00A0INV-X-Y\u00A0', expected: 'INV-X-Y' },
  { name: 'trims zero-width spaces', input: '\u200B\u200C\u200D\uFEFFINV-X-Y\u200B\u200C\u200D\uFEFF', expected: 'INV-X-Y' },
  { name: 'trims line and paragraph separators', input: '\u2028\u2029INV-X-Y\u2028\u2029', expected: 'INV-X-Y' },

  // empty cases
  { name: 'whitespace-only string returns empty string', input: '   ', expected: '' },
  { name: 'empty string returns empty string', input: '', expected: '' },
  { name: 'null input returns empty string', input: null, expected: '' },
  { name: 'undefined input returns empty string', input: undefined, expected: '' },
  { name: 'mixed NBSP-only input returns empty string', input: '\u00A0\u200B\u00A0', expected: '' },

  // identity cases
  { name: 'identity for already-normalized alphanumeric', input: 'INV-ABCDEF-12345678', expected: 'INV-ABCDEF-12345678' },
  { name: 'identity preserves internal whitespace', input: 'hello world', expected: 'hello world' },
  { name: 'identity preserves case', input: 'INV-AbCdEf', expected: 'INV-AbCdEf' },
  { name: 'identity preserves punctuation', input: 'INV-X-Y!', expected: 'INV-X-Y!' },
  { name: 'identity preserves internal NBSP', input: 'INV-X\u00A0Y', expected: 'INV-X\u00A0Y' },
];

let passed = 0;
let failed = 0;

for (const c of cases) {
  try {
    assert.equal(normalizeMemo(c.input), c.expected, c.name);
    passed += 1;
  } catch (err) {
    failed += 1;
    process.stderr.write(
      `not ok - ${c.name}: ${
        err instanceof Error ? err.message : String(err)
      }\n`
    );
  }
}

process.stderr.write(`\n${passed}/${cases.length} passed\n`);

if (passed !== cases.length) {
  process.exit(1);
}
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
