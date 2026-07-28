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
