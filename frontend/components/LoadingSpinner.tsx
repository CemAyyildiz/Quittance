'use client';

import { Loader2 } from 'lucide-react';

type SpinnerVariant = 'default' | 'teal' | 'muted';
type SpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  /** Accessible label for screen readers. Defaults to "Loading" if omitted. */
  label?: string;
  /** Visible message shown below the spinner. */
  message?: string;
  /** Spinner size preset. @default 'md' */
  size?: SpinnerSize;
  /** Color variant. @default 'teal' */
  variant?: SpinnerVariant;
  /** Additional CSS classes applied to the wrapper. */
  className?: string;
  /** When true, label text is visually hidden but still announced to screen readers. @default false */
  hideLabel?: boolean;
  /** Custom test id for querying in tests. */
  'data-testid'?: string;
}

const sizeMap: Record<SpinnerSize, { icon: number; text: string }> = {
  sm: { icon: 16, text: 'text-xs' },
  md: { icon: 24, text: 'text-sm' },
  lg: { icon: 36, text: 'text-base' },
};

const variantMap: Record<SpinnerVariant, string> = {
  default: 'text-gray-500',
  teal: 'text-[var(--teal)]',
  muted: 'text-[var(--muted)]',
};

export default function LoadingSpinner({
  label = 'Loading',
  message,
  size = 'md',
  variant = 'teal',
  className = '',
  hideLabel = false,
  'data-testid': testId,
}: LoadingSpinnerProps) {
  const { icon: iconSize, text: textSize } = sizeMap[size];
  const colorClass = variantMap[variant];

  return (
    <div
      role="status"
      className={`inline-flex flex-col items-center justify-center gap-2 ${className}`}
      data-testid={testId}
    >
      <Loader2
        className={`animate-spin ${colorClass}`}
        size={iconSize}
        aria-hidden="true"
      />

      <span className={hideLabel ? 'sr-only' : `font-medium ${textSize} ${colorClass}`}>
        {message ?? label}
      </span>
    </div>
  );
}
