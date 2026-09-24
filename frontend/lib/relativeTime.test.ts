import { describe, it, expect } from 'vitest';
import { relativeTime } from './relativeTime';

/**
 * All tests pin a fixed `now` value so that results are deterministic and no
 * fake-timer machinery is required.  The reference epoch is arbitrary.
 */
const NOW = new Date('2024-06-15T12:00:00.000Z');
const nowMs = NOW.getTime();

/** Helper: return a timestamp `seconds` before NOW. */
const ago = (seconds: number): Date => new Date(nowMs - seconds * 1_000);

/** Helper: return a timestamp `seconds` after NOW (future). */
const inFuture = (seconds: number): Date => new Date(nowMs + seconds * 1_000);

describe('relativeTime', () => {
  // ── "just now" ─────────────────────────────────────────────────────────────

  it('returns "just now" for 0 seconds ago', () => {
    expect(relativeTime(NOW, NOW)).toBe('just now');
  });

  it('returns "just now" for 1 second ago', () => {
    expect(relativeTime(ago(1), NOW)).toBe('just now');
  });

  it('returns "just now" for 44 seconds ago (< 45 s threshold)', () => {
    expect(relativeTime(ago(44), NOW)).toBe('just now');
  });

  it('returns "just now" for a Date object exactly at now', () => {
    expect(relativeTime(new Date(nowMs), NOW)).toBe('just now');
  });

  // ── "1 minute ago" ─────────────────────────────────────────────────────────

  it('returns "1 minute ago" for 45 seconds ago', () => {
    expect(relativeTime(ago(45), NOW)).toBe('1 minute ago');
  });

  it('returns "1 minute ago" for 60 seconds ago', () => {
    expect(relativeTime(ago(60), NOW)).toBe('1 minute ago');
  });

  it('returns "1 minute ago" for 89 seconds ago', () => {
    expect(relativeTime(ago(89), NOW)).toBe('1 minute ago');
  });

  // ── "N minutes ago" ────────────────────────────────────────────────────────

  it('returns "2 minutes ago" for 90 seconds ago', () => {
    expect(relativeTime(ago(90), NOW)).toBe('2 minutes ago');
  });

  it('returns "5 minutes ago" for 5 minutes ago', () => {
    expect(relativeTime(ago(5 * 60), NOW)).toBe('5 minutes ago');
  });

  it('returns "30 minutes ago" for 30 minutes ago', () => {
    expect(relativeTime(ago(30 * 60), NOW)).toBe('30 minutes ago');
  });

  it('returns "44 minutes ago" at the upper edge of the minutes band', () => {
    // 44 m 29 s  →  rounds to 44 minutes
    expect(relativeTime(ago(44 * 60 + 29), NOW)).toBe('44 minutes ago');
  });

  // ── "1 hour ago" ───────────────────────────────────────────────────────────

  it('returns "1 hour ago" for 45 minutes ago', () => {
    expect(relativeTime(ago(45 * 60), NOW)).toBe('1 hour ago');
  });

  it('returns "1 hour ago" for 60 minutes ago', () => {
    expect(relativeTime(ago(60 * 60), NOW)).toBe('1 hour ago');
  });

  it('returns "1 hour ago" for 89 minutes ago', () => {
    expect(relativeTime(ago(89 * 60), NOW)).toBe('1 hour ago');
  });

  // ── "N hours ago" ──────────────────────────────────────────────────────────

  it('returns "2 hours ago" for 90 minutes ago', () => {
    expect(relativeTime(ago(90 * 60), NOW)).toBe('2 hours ago');
  });

  it('returns "3 hours ago" for 3 hours ago', () => {
    expect(relativeTime(ago(3 * 3_600), NOW)).toBe('3 hours ago');
  });

  it('returns "12 hours ago" for 12 hours ago', () => {
    expect(relativeTime(ago(12 * 3_600), NOW)).toBe('12 hours ago');
  });

  it('returns "21 hours ago" at upper edge of hours band (21.4 h)', () => {
    // 21 h 24 m  →  diffSec = 77,040  →  round(77040/3600) = 21
    expect(relativeTime(ago(21 * 3_600 + 24 * 60), NOW)).toBe('21 hours ago');
  });

  // ── "yesterday" ────────────────────────────────────────────────────────────

  it('returns "yesterday" for 22 hours ago', () => {
    expect(relativeTime(ago(22 * 3_600), NOW)).toBe('yesterday');
  });

  it('returns "yesterday" for 24 hours ago', () => {
    expect(relativeTime(ago(24 * 3_600), NOW)).toBe('yesterday');
  });

  it('returns "yesterday" for 35 hours ago', () => {
    expect(relativeTime(ago(35 * 3_600), NOW)).toBe('yesterday');
  });

  // ── "N days ago" ───────────────────────────────────────────────────────────

  it('returns "2 days ago" for 2 days ago', () => {
    expect(relativeTime(ago(2 * 86_400), NOW)).toBe('2 days ago');
  });

  it('returns "3 days ago" for 3 days ago', () => {
    expect(relativeTime(ago(3 * 86_400), NOW)).toBe('3 days ago');
  });

  it('returns "5 days ago" for 5 days ago', () => {
    expect(relativeTime(ago(5 * 86_400), NOW)).toBe('5 days ago');
  });

  // ── "N weeks ago" ──────────────────────────────────────────────────────────

  it('returns "1 week ago" for 7 days ago', () => {
    expect(relativeTime(ago(7 * 86_400), NOW)).toBe('1 week ago');
  });

  it('returns "2 weeks ago" for 14 days ago', () => {
    expect(relativeTime(ago(14 * 86_400), NOW)).toBe('2 weeks ago');
  });

  it('returns "3 weeks ago" for 21 days ago', () => {
    expect(relativeTime(ago(21 * 86_400), NOW)).toBe('3 weeks ago');
  });

  // ── "N months ago" ─────────────────────────────────────────────────────────

  it('returns "1 month ago" for 30 days ago', () => {
    expect(relativeTime(ago(30 * 86_400), NOW)).toBe('1 month ago');
  });

  it('returns "2 months ago" for 60 days ago', () => {
    expect(relativeTime(ago(60 * 86_400), NOW)).toBe('2 months ago');
  });

  it('returns "6 months ago" for 180 days ago', () => {
    expect(relativeTime(ago(180 * 86_400), NOW)).toBe('6 months ago');
  });

  // ── "N years ago" ──────────────────────────────────────────────────────────

  it('returns "1 year ago" for 365 days ago', () => {
    expect(relativeTime(ago(365 * 86_400), NOW)).toBe('1 year ago');
  });

  it('returns "2 years ago" for 730 days ago', () => {
    expect(relativeTime(ago(730 * 86_400), NOW)).toBe('2 years ago');
  });

  it('returns "5 years ago" for 1825 days ago', () => {
    expect(relativeTime(ago(1_825 * 86_400), NOW)).toBe('5 years ago');
  });

  // ── Input format variants ──────────────────────────────────────────────────

  it('accepts a numeric timestamp (ms since epoch)', () => {
    expect(relativeTime(nowMs - 5 * 60_000, NOW)).toBe('5 minutes ago');
  });

  it('accepts an ISO 8601 string', () => {
    const iso = ago(3 * 3_600).toISOString();
    expect(relativeTime(iso, NOW)).toBe('3 hours ago');
  });

  it('accepts a Date object as timestamp', () => {
    expect(relativeTime(ago(2 * 86_400), NOW)).toBe('2 days ago');
  });

  it('accepts a numeric `now` reference', () => {
    expect(relativeTime(ago(10 * 60), nowMs)).toBe('10 minutes ago');
  });

  it('accepts an ISO string `now` reference', () => {
    expect(relativeTime(ago(10 * 60), NOW.toISOString())).toBe('10 minutes ago');
  });

  // ── Future timestamps ──────────────────────────────────────────────────────

  it('treats a future timestamp within 44 s as "just now"', () => {
    expect(relativeTime(inFuture(30), NOW)).toBe('just now');
  });

  it('treats a future timestamp of 5 minutes as "5 minutes ago"', () => {
    expect(relativeTime(inFuture(5 * 60), NOW)).toBe('5 minutes ago');
  });

  // ── Boundary: singular vs plural ──────────────────────────────────────────

  it('uses singular "minute" when rounded value is 1', () => {
    // 45 s is caught by the "1 minute ago" branch, not plural.
    expect(relativeTime(ago(60), NOW)).toBe('1 minute ago');
  });

  it('uses plural "minutes" when rounded value is 2', () => {
    expect(relativeTime(ago(2 * 60), NOW)).toBe('2 minutes ago');
  });

  it('uses singular "hour" when rounded value is 1', () => {
    expect(relativeTime(ago(60 * 60), NOW)).toBe('1 hour ago');
  });

  it('uses plural "hours" for 2+ hours', () => {
    expect(relativeTime(ago(2 * 3_600), NOW)).toBe('2 hours ago');
  });

  it('uses singular "day" when rounded value is 1 (36 h)', () => {
    // ~36 h rounds to 2 days, so test an explicit 1-day distance past "yesterday"
    // 35 h 31 m = 128,100 s → round(128100/86400) = 1 → "1 day ago"
    expect(relativeTime(ago(35 * 3_600 + 31 * 60), NOW)).toBe('1 day ago');
  });

  it('uses singular "week"', () => {
    // 7 days exactly
    expect(relativeTime(ago(7 * 86_400), NOW)).toBe('1 week ago');
  });

  it('uses singular "month"', () => {
    expect(relativeTime(ago(30 * 86_400), NOW)).toBe('1 month ago');
  });

  it('uses singular "year"', () => {
    expect(relativeTime(ago(365 * 86_400), NOW)).toBe('1 year ago');
  });
});
