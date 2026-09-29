/**
 * Format a duration in seconds into a human-readable string.
 *
 * Examples:
 * - 0 → "0s"
 * - 45 → "45s"
 * - 130 → "2m 10s"
 * - 3700 → "1h 1m 40s"
 *
 * Hours and minutes are omitted when zero, but seconds are always shown.
 */
export function formatUptime(totalSeconds: number): string {
  const hours: number = Math.floor(totalSeconds / 3600);
  const minutes: number = Math.floor((totalSeconds % 3600) / 60);
  const seconds: number = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}
