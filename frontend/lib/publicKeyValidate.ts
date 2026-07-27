const STELLAR_PUBLIC_KEY_RE = /^G[A-Z2-7]{55}$/;

export function isValidStellarPublicKey(publicKey: string): boolean {
  if (typeof publicKey !== 'string') {
    return false;
  }

  return STELLAR_PUBLIC_KEY_RE.test(publicKey.trim());
}
