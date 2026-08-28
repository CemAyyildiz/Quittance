/**
 * relativeTime.ts
 *
 * Converts a timestamp (Date | string | number) into a human-readable
 * English relative-time string.
 *
 * Examples:
 *   "just now"      – within the last 45 seconds
 *   "1 minute ago"  – 45 s – 89 s
 *   "5 minutes ago" – 90 s – 44 m 29 s
 *   "1 hour ago"    – 44 m 30 s – 89 m 29 s
 *   "3 hours ago"   – 89 m 30 s – 21 h 29 m
 *   "yesterday"     – 21 h 30 m – 35 h 29 m
 *   "3 days ago"    – 35 h 30 m – 6 d 11 h
 *   "3 weeks ago"   – 6 d 12 h – 27 d 23 h
 *   "2 months ago"  – 28 d – ~10.9 months
 *   "2 years ago"   – ~11 months +
 *
 * The function is pure and accepts an optional `now` parameter so it is
 * trivially testable without fake timers.
 */

/** Accepted timestamp formats. */
export type Timestamp = Date | string | number;

/** Duration constants in seconds. */
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Formats `value` with the correct singular/plural English noun and "ago".
 *
 * @example plural(1, 'minute') → "1 minute ago"
 * @example plural(5, 'minute') → "5 minutes ago"
 */
function plural(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
}

/**
 * Converts a timestamp into a human-readable English relative-time string.
 *
 * @param timestamp - The past (or future) point in time to describe.
 * @param now       - Optional reference point; defaults to `new Date()`.
 *                    Passing this explicitly makes unit-testing deterministic
 *                    and removes any dependency on a global clock.
 * @returns A string like "just now", "3 minutes ago", "yesterday", etc.
 *
 * @example
 * relativeTime(Date.now() - 5_000);          // "just now"
 * relativeTime(Date.now() - 5 * 60_000);     // "5 minutes ago"
 * relativeTime(Date.now() - 25 * 3_600_000); // "yesterday"
 */
export function relativeTime(timestamp: Timestamp, now: Timestamp = new Date()): string {
  const tMs =
    timestamp instanceof Date ? timestamp.getTime() : new Date(timestamp).getTime();
  const nMs =
    now instanceof Date ? now.getTime() : new Date(now).getTime();

  // Use absolute difference so future timestamps degrade gracefully.
  const diffMs = Math.abs(nMs - tMs);
  const diffSec = Math.round(diffMs / 1_000);

  // < 45 s
  if (diffSec < 45) {
    return 'just now';
  }

  // 45 s – 89 s  →  "1 minute ago"
  if (diffSec < 90) {
    return '1 minute ago';
  }

  // 90 s – 44 m 29 s  →  "N minutes ago"
  if (diffSec < 45 * MINUTE) {
    return plural(Math.round(diffSec / MINUTE), 'minute');
  }

  // 44 m 30 s – 89 m 29 s  →  "1 hour ago"
  if (diffSec < 90 * MINUTE) {
    return '1 hour ago';
  }

  // 89 m 30 s – 21 h 29 m  →  "N hours ago"
  if (diffSec < 21.5 * HOUR) {
    return plural(Math.round(diffSec / HOUR), 'hour');
  }

  // 21 h 30 m – 35 h 29 m  →  "yesterday"
  if (diffSec < 35.5 * HOUR) {
    return 'yesterday';
  }

  // 35 h 30 m – 6 d 11 h  →  "N days ago"
  if (diffSec < 6 * DAY + 12 * HOUR) {
    return plural(Math.round(diffSec / DAY), 'day');
  }

  // 6 d 12 h – 27 d 23 h  →  "N weeks ago"
  if (diffSec < 4 * WEEK) {
    return plural(Math.round(diffSec / WEEK), 'week');
  }

  // 28 d – ~10.9 months  →  "N months ago"
  if (diffSec < 11 * MONTH) {
    return plural(Math.max(1, Math.round(diffSec / MONTH)), 'month');
  }

  // 11 months +  →  "N years ago"
  return plural(Math.max(1, Math.round(diffSec / YEAR)), 'year');
}
