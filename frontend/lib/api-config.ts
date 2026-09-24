/**
 * Mock API selection guard.
 *
 * The mock API is intended for **local development only**.
 * Production and demo environments must use the real backend.
 *
 * Rules (all must pass for mock to be enabled):
 * - `NEXT_PUBLIC_USE_MOCK` must be exactly `"true"`
 * - `NODE_ENV` must not be `"production"` (hard block for deployed builds)
 *
 * Unset / `"false"` / any other value → real API (safe default).
 */
export function isMockEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return process.env.NEXT_PUBLIC_USE_MOCK === 'true';
}
