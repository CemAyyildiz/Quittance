/**
 * Formats an instant as a fixed UTC string such as "2024-06-15 12:00 UTC".
 *
 * Payment proof must read the same in every country, so the clock is always
 * UTC rather than the viewer's local timezone. A missing or unparsable value
 * returns `UTC_UNAVAILABLE` instead of falling back to the current time.
 */
export const UTC_UNAVAILABLE = 'Unavailable';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatUtc(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return UTC_UNAVAILABLE;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return UTC_UNAVAILABLE;

  const day = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  const time = `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
  return `${day} ${time} UTC`;
}
