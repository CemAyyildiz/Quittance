import { describe, it, expect } from 'vitest';
import { formatUtc, UTC_UNAVAILABLE } from './formatUtc';

describe('formatUtc', () => {
  it('formats a fixture instant as a UTC string', () => {
    expect(formatUtc('2024-06-15T12:34:56.000Z')).toBe('2024-06-15 12:34 UTC');
  });

  it('converts an offset timestamp to UTC', () => {
    expect(formatUtc('2024-06-15T23:30:00+03:00')).toBe('2024-06-15 20:30 UTC');
  });

  it('accepts Date objects and epoch milliseconds', () => {
    const instant = Date.UTC(2025, 0, 2, 3, 4);
    expect(formatUtc(new Date(instant))).toBe('2025-01-02 03:04 UTC');
    expect(formatUtc(instant)).toBe('2025-01-02 03:04 UTC');
  });

  it('shows an unparsable timestamp as unavailable, not the current time', () => {
    expect(formatUtc('not-a-date')).toBe(UTC_UNAVAILABLE);
    expect(formatUtc(new Date('invalid'))).toBe(UTC_UNAVAILABLE);
  });

  it('shows a missing timestamp as unavailable', () => {
    expect(formatUtc(undefined)).toBe(UTC_UNAVAILABLE);
    expect(formatUtc(null)).toBe(UTC_UNAVAILABLE);
    expect(formatUtc('')).toBe(UTC_UNAVAILABLE);
  });
});
