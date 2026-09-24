'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export type SpinnerSize =
  | 'small'
  | 'medium'
  | 'large'
  | 'sm'
  | 'md'
  | 'lg'
  | number;

export type SpinnerVariant =
  | 'default'
  | 'teal'
  | 'muted'
  | 'primary'
  | 'secondary';

export interface LoadingSpinnerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'size'> {
  /** Accessible label for screen readers. Defaults to "Loading..." if omitted. */
  label?: string;
  /** Visible message shown below or next to the spinner. */
  message?: string;
  /** Visual size preset or numeric pixel value in px. @default 'md' */
  size?: SpinnerSize;
  /** Color variant preset. @default 'teal' */
  variant?: SpinnerVariant;
  /** Additional CSS classes applied to the wrapper element. */
  className?: string;
  /** When true, visually displays the label text. @default false */
  showLabel?: boolean;
  /** When true, visually hides the label text (sr-only). */
  hideLabel?: boolean;
  /** Custom test id for querying in tests. */
  'data-testid'?: string;
}

const variantMap: Record<SpinnerVariant, string> = {
  default: 'text-gray-500',
  teal: 'text-[var(--teal)]',
  muted: 'text-[var(--muted)]',
  primary: 'text-cyan-600',
  secondary: 'text-slate-600',
};

function getSpinnerSizeDetails(size: SpinnerSize): {
  iconSize: number;
  textSize: string;
  gapClass: string;
} {
  if (typeof size === 'number') {
    const textSize = size >= 32 ? 'text-base' : size <= 18 ? 'text-xs' : 'text-sm';
    return { iconSize: size, textSize, gapClass: 'gap-2' };
  }

  switch (size) {
    case 'small':
    case 'sm':
      return { iconSize: 16, textSize: 'text-xs', gapClass: 'gap-1.5' };
    case 'large':
    case 'lg':
      return { iconSize: 36, textSize: 'text-base', gapClass: 'gap-3' };
    case 'medium':
    case 'md':
    default:
      return { iconSize: 24, textSize: 'text-sm', gapClass: 'gap-2' };
  }
}

export default function LoadingSpinner({
  label = 'Loading...',
  message,
  size = 'md',
  variant = 'teal',
  className = '',
  showLabel,
  hideLabel,
  'data-testid': testId,
  ...restProps
}: LoadingSpinnerProps) {
  const { iconSize, textSize, gapClass } = getSpinnerSizeDetails(size);
  const colorClass = variantMap[variant] ?? variantMap.teal;

  const isVisuallyHidden =
    hideLabel !== undefined
      ? hideLabel
      : showLabel !== undefined
        ? !showLabel
        : !message;

  const textToDisplay = message ?? label;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={testId}
      className={`inline-flex flex-col items-center justify-center ${gapClass} ${className}`.trim()}
      {...restProps}
    >
      <Loader2
        className={`animate-spin ${colorClass}`}
        size={iconSize}
        aria-hidden="true"
      />
      <span
        className={
          isVisuallyHidden
            ? 'sr-only'
            : `font-medium ${textSize} ${colorClass}`
        }
      >
        {textToDisplay}
      </span>
    </div>
  );
}
