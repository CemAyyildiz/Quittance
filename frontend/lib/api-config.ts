/**
 * Mock API selection guard.
 *
 * The mock API is intended for **local development only**.
 * Production and demo environments must use the real backend.
 *
 * - `NEXT_PUBLIC_USE_MOCK=true`  → mock API selected
 * - `NEXT_PUBLIC_USE_MOCK=false` → real API selected (default when unset)
 */
export function isMockEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK === 'true';
}
