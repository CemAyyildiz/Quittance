/**
 * Stellar network identifier as used by stellar.expert URL segments.
 *
 * `TESTNET` → `"testnet"`, `PUBLIC` → `"public"`.
 * Matches the `NEXT_PUBLIC_STELLAR_NETWORK` env-var convention used
 * throughout the Quittance frontend.
 */
export type StellarNetwork = 'TESTNET' | 'PUBLIC';

/** Default explorer base URL. */
const EXPLORER_BASE = 'https://stellar.expert/explorer';

/**
 * Map the canonical network name to the stellar.expert path segment.
 */
function networkSegment(network: StellarNetwork): string {
  return network === 'TESTNET' ? 'testnet' : 'public';
}

/**
 * Resolve the network to use:
 * 1. Explicit `network` argument if provided.
 * 2. Falls back to `NEXT_PUBLIC_STELLAR_NETWORK` env var.
 * 3. Ultimate fallback: `'TESTNET'`.
 */
function resolveNetwork(network?: StellarNetwork): StellarNetwork {
  if (network) return network;
  const env = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STELLAR_NETWORK;
  if (env === 'PUBLIC') return 'PUBLIC';
  return 'TESTNET';
}

/**
 * Build a `stellar.expert` account explorer URL.
 *
 * @param address - Stellar public key (G…). Must be non-empty.
 * @param network - Optional network override. Defaults to env or `'TESTNET'`.
 * @returns Full explorer URL, e.g. `https://stellar.expert/explorer/testnet/account/G…`
 * @throws {TypeError} If `address` is empty or not a string.
 */
export function explorerAccountUrl(address: string, network?: StellarNetwork): string {
  if (typeof address !== 'string' || address.trim().length === 0) {
    throw new TypeError('explorerAccountUrl: address must be a non-empty string');
  }

  const net = resolveNetwork(network);
  return `${EXPLORER_BASE}/${networkSegment(net)}/account/${encodeURIComponent(address.trim())}`;
}

/**
 * Build a `stellar.expert` transaction explorer URL.
 *
 * @param txHash - Transaction hash (hex). Must be non-empty.
 * @param network - Optional network override. Defaults to env or `'TESTNET'`.
 * @returns Full explorer URL, e.g. `https://stellar.expert/explorer/public/tx/abc123…`
 * @throws {TypeError} If `txHash` is empty or not a string.
 */
export function explorerTxUrl(txHash: string, network?: StellarNetwork): string {
  if (typeof txHash !== 'string' || txHash.trim().length === 0) {
    throw new TypeError('explorerTxUrl: txHash must be a non-empty string');
  }

  const net = resolveNetwork(network);
  return `${EXPLORER_BASE}/${networkSegment(net)}/tx/${encodeURIComponent(txHash.trim())}`;
}
