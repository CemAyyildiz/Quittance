'use client';

import { cn } from '@/lib/utils';

interface MemoChipProps {
  memo: string;
  maxLength?: number;
  className?: string;
}

export default function MemoChip({ memo, maxLength = 24, className }: MemoChipProps) {
  const truncated = memo.length > maxLength
    ? `${memo.slice(0, maxLength)}...`
    : memo;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700',
        className,
      )}
      title={memo}
      aria-label={`Memo: ${memo}`}
    >
      {truncated}
    </span>
  );
}
