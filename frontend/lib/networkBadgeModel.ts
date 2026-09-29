/**
 * Resolve the network kind for the app-chrome badge.
 *
 * Unset or blank configuration defaults to `TESTNET` so a deployment that
 * forgot to set `NEXT_PUBLIC_STELLAR_NETWORK` still advertises the demo
 * network instead of silently looking like mainnet. Explicit `PUBLIC` and any
 * other unrecognised value hide the badge.
 */
export function networkBadgeModel(value?: string | null): 'TESTNET' | 'PUBLIC' {
  if (typeof value !== 'string') {
    return 'TESTNET';
  }

  const normalizedValue = value.trim().toUpperCase();

  if (normalizedValue === 'PUBLIC') {
    return 'PUBLIC';
  }

  if (normalizedValue === 'TESTNET' || normalizedValue === '') {
    return 'TESTNET';
  }

  return 'PUBLIC';
}
