'use client';

export type InvoiceStatusBadgeStatus = 'PENDING' | 'PAID' | 'EXPIRED';
export type InvoiceStatusBadgeSize = 'sm' | 'md' | 'lg';

interface InvoiceStatusBadgeProps {
  status: InvoiceStatusBadgeStatus;
  /** Visual size preset. @default 'md' */
  size?: InvoiceStatusBadgeSize;
  /** Visually hides the label text while keeping it available to screen readers. @default false */
  hideLabel?: boolean;
  className?: string;
  /** Custom test id for querying in tests. */
  'data-testid'?: string;
}

const labels: Record<InvoiceStatusBadgeStatus, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  EXPIRED: 'Expired',
};

const styles: Record<
  InvoiceStatusBadgeStatus,
  { container: string; dot: string }
> = {
  PENDING: {
    container:
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200',
    dot: 'bg-amber-500',
  },
  PAID: {
    container:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-200',
    dot: 'bg-emerald-500',
  },
  EXPIRED: {
    container:
      'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-200',
    dot: 'bg-rose-500',
  },
};

const sizeMap: Record<
  InvoiceStatusBadgeSize,
  { container: string; dot: string }
> = {
  sm: { container: 'gap-1.5 px-2 py-0.5 text-xs', dot: 'h-2 w-2' },
  md: { container: 'gap-2 px-2.5 py-1 text-sm', dot: 'h-2.5 w-2.5' },
  lg: { container: 'gap-2.5 px-3 py-1.5 text-base', dot: 'h-3 w-3' },
};

export default function InvoiceStatusBadge({
  status,
  size = 'md',
  hideLabel = false,
  className,
  'data-testid': testId,
}: InvoiceStatusBadgeProps) {
  const label = labels[status];
  const tone = styles[status];
  const sizing = sizeMap[size];

  return (
    <span
      role="status"
      aria-label={`Invoice status: ${label}`}
      data-testid={testId}
      className={`inline-flex items-center rounded-full border font-semibold whitespace-nowrap ${tone.container} ${sizing.container} ${className ?? ''}`.trim()}
    >
      <span
        className={`rounded-full ${tone.dot} ${sizing.dot}`}
        aria-hidden="true"
      />
      {!hideLabel && <span>{label}</span>}
    </span>
  );
}
