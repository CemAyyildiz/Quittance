'use client';

interface InvoiceStatusBadgeProps {
  status: 'PENDING' | 'PAID' | 'EXPIRED';
  className?: string;
}

const labels: Record<InvoiceStatusBadgeProps['status'], string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  EXPIRED: 'Expired',
};

const styles: Record<
  InvoiceStatusBadgeProps['status'],
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

export default function InvoiceStatusBadge({
  status,
  className,
}: InvoiceStatusBadgeProps) {
  const label = labels[status];
  const tone = styles[status];

  return (
    <span
      role="status"
      aria-label={`Invoice status: ${label}`}
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-sm font-semibold whitespace-nowrap ${tone.container} ${className ?? ''}`.trim()}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${tone.dot}`}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}
