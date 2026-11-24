'use client';

import { formatDate } from '@/lib/utils';

export interface StatusHistoryRow {
  status: string;
  at: string;
  txHash?: string;
}

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Created',
  EXTENDED: 'Extended',
  VOIDED: 'Voided',
  PARTIALLY_PAID: 'Partially paid',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
  EXPIRED: 'Expired',
};

function labelFor(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/**
 * Seller-facing, append-only status trail. Deliberately not imported by the
 * payer's `/pay/[id]` page. Rows render oldest first, exactly as returned by
 * the API, and never contain customer contact details.
 */
export default function StatusHistory({ entries }: { entries: StatusHistoryRow[] }) {
  return (
    <section className="card" aria-label="Status history">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Status history</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">No status changes yet.</p>
      ) : (
        <ol className="space-y-3">
          {entries.map((entry, index) => (
            <li key={`${entry.status}-${entry.at}-${index}`} className="flex flex-col gap-1 border-b pb-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-gray-900">{labelFor(entry.status)}</span>
                <time className="text-xs text-gray-500" dateTime={entry.at}>
                  {formatDate(entry.at)}
                </time>
              </div>
              {entry.txHash && (
                <span className="font-mono text-xs text-gray-600 break-all">{entry.txHash}</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
