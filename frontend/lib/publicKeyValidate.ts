const STELLAR_ED25519_PUBLIC_KEY_REGEX = /^G[A-Z2-7]{55}$/;

export function isValidStellarPublicKey(value: string): boolean {
  if (typeof value !== 'string') return false;
  return STELLAR_ED25519_PUBLIC_KEY_REGEX.test(value.trim());
}
