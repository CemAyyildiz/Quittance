'use client';

import { networkBadgeModel } from '../lib/networkBadgeModel';

/**
 * NetworkBadge — small shared badge that appears in the app chrome
 * when NEXT_PUBLIC_STELLAR_NETWORK === 'TESTNET' so users never confuse
 * demo funds with mainnet.
 *
 * Hidden entirely when configured for PUBLIC (mainnet).
 */
export default function NetworkBadge() {
  const kind = networkBadgeModel(process.env.NEXT_PUBLIC_STELLAR_NETWORK);

  if (kind === 'PUBLIC') return null;

  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider select-none"
      style={{
        borderColor: 'rgba(180, 83, 9, 0.3)',
        backgroundColor: 'rgba(254, 243, 199, 0.9)',
        color: '#92400e',
      }}
    >
      {kind}
    </span>
  );
}
