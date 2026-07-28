export function networkBadgeModel(value?: string | null): 'TESTNET' | 'PUBLIC' {
  if (typeof value !== 'string') {
    return 'PUBLIC';
  }

  const normalizedValue = value.trim().toUpperCase();

  if (normalizedValue === 'TESTNET') {
    return 'TESTNET';
  }

  return 'PUBLIC';
}
