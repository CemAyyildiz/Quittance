import { ExternalLink } from 'lucide-react';
import clsx from 'clsx';

// ── Types ────────────────────────────────────────────────────────────────

export interface ExplorerLinkProps {
  /** 64-character hex transaction hash to linkify */
  txHash: string;
  /** Stellar network to build the explorer URL for. Defaults to env config. */
  network?: 'testnet' | 'public';
  /** Extra className appended to the wrapper element */
  className?: string;
  /** Whether to render the ExternalLink icon. Default true. */
  showIcon?: boolean;
  /** Custom link label. Defaults to the truncated txHash. */
  children?: React.ReactNode;
}

// ── Constants ────────────────────────────────────────────────────────────

/** A valid Stellar transaction hash: exactly 64 lowercase or uppercase hex digits. */
const TX_HASH_RE = /^[0-9a-fA-F]{64}$/;

const NETWORK_SEGMENT: Record<'testnet' | 'public', string> = {
  testnet: 'testnet',
  public: 'public',
};

// ── Helpers ──────────────────────────────────────────────────────────────

/** Derive the explorer network segment from props + env, defaulting to testnet. */
function resolveNetwork(network?: 'testnet' | 'public'): 'testnet' | 'public' {
  if (network) return network;
  return process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'PUBLIC'
    ? 'public'
    : 'testnet';
}

/** Build the full explorer URL for a transaction hash. */
function explorerUrl(hash: string, network: 'testnet' | 'public'): string {
  return `https://stellar.expert/explorer/${NETWORK_SEGMENT[network]}/tx/${hash}`;
}

/** Shorten a hash for display: first 8 … last 6 chars. */
function shortenHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

// ── Component ────────────────────────────────────────────────────────────

/**
 * ExplorerLink – presentational component that renders a Stellar transaction
 * hash as a clickable link to stellar.expert **only** when the value matches
 * the 64‑hex‑character allow‑list.  Otherwise it falls back to plain text.
 *
 * Safe to drop anywhere as an unmounted leaf — it has zero Freighter / Google
 * side effects and is purely props‑driven.
 */
export default function ExplorerLink({
  txHash,
  network,
  className,
  showIcon = true,
  children,
}: ExplorerLinkProps) {
  const isValid = TX_HASH_RE.test(txHash);

  // Plain‑text fallback when the hash doesn't pass allow‑list validation.
  if (!isValid) {
    return (
      <span
        className={clsx('font-mono text-xs break-all select-all', className)}
        title={txHash || 'Invalid transaction hash'}
      >
        {txHash || '—'}
      </span>
    );
  }

  const resolvedNetwork = resolveNetwork(network);
  const url = explorerUrl(txHash, resolvedNetwork);
  const label = children ?? shortenHash(txHash);
  const networkLabel =
    resolvedNetwork === 'testnet' ? 'Testnet' : 'Public';

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx(
        'inline-flex items-center gap-1.5 font-mono text-sm transition-colors duration-150',
        'text-[var(--teal)] hover:text-[var(--teal-hover)] hover:underline underline-offset-2',
        'focus-visible:underline',
        className,
      )}
      aria-label={`View transaction ${txHash} on Stellar Explorer (${networkLabel})`}
      title={`Open ${txHash} on Stellar Explorer (${networkLabel})`}
    >
      {label}
      {showIcon && <ExternalLink className="w-3.5 h-3.5 shrink-0" />}
    </a>
  );
}
