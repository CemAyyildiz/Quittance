'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

export type CopyButtonSize = 'sm' | 'md' | 'lg';
export type CopyButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

export interface CopyButtonProps {
  /** The text that will be copied to the clipboard. */
  text: string;
  /** Label shown before copying. @default 'Copy' */
  label?: string;
  /** Label shown briefly after a successful copy. @default 'Copied!' */
  copiedLabel?: string;
  /** Accessible name override. Defaults to whichever label is currently visible. */
  ariaLabel?: string;
  /** Visual size preset. @default 'md' */
  size?: CopyButtonSize;
  /** Visual style variant. @default 'outline' */
  variant?: CopyButtonVariant;
  /** Visually hides the label text while keeping it available to screen readers. @default false */
  hideLabel?: boolean;
  /** Milliseconds to show the "copied" state before reverting. @default 2000 */
  resetDelayMs?: number;
  /** Disables the button and prevents copying. @default false */
  disabled?: boolean;
  /** Called after each copy attempt with whether it succeeded. */
  onCopy?: (success: boolean) => void;
  /** Additional class names applied to the button element. */
  className?: string;
  /** Custom test id for querying in tests. */
  'data-testid'?: string;
}

/**
 * Writes text to the clipboard using the async Clipboard API, falling back to
 * a hidden textarea + execCommand for environments where it's unavailable.
 */
export async function writeToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy fallback below.
    }
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  let succeeded = false;
  try {
    succeeded = document.execCommand('copy');
  } catch {
    succeeded = false;
  } finally {
    document.body.removeChild(textarea);
  }

  return succeeded;
}

const sizeMap: Record<CopyButtonSize, { className: string; icon: number }> = {
  sm: { className: 'px-3 py-1.5 text-xs', icon: 14 },
  md: { className: 'px-5 py-2.5 text-sm', icon: 16 },
  lg: { className: 'px-6 py-3 text-base', icon: 18 },
};

const variantMap: Record<CopyButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  outline: 'btn-outline',
  ghost: 'bg-transparent hover:bg-[var(--paper-deep)] text-[var(--ink)]',
};

export default function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied!',
  ariaLabel,
  size = 'md',
  variant = 'outline',
  hideLabel = false,
  resetDelayMs = 2000,
  disabled = false,
  onCopy,
  className = '',
  'data-testid': testId,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClick = useCallback(async () => {
    if (disabled) return;

    const success = await writeToClipboard(text);

    if (success) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setCopied(true);
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
        timeoutRef.current = null;
      }, resetDelayMs);
    }

    onCopy?.(success);
  }, [disabled, onCopy, resetDelayMs, text]);

  const { className: sizeClassName, icon: iconSize } = sizeMap[size];
  const Icon = copied ? Check : Copy;
  const currentLabel = copied ? copiedLabel : label;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`btn ${variantMap[variant]} ${sizeClassName} ${className}`}
      aria-label={ariaLabel ?? currentLabel}
      data-testid={testId}
    >
      <Icon size={iconSize} aria-hidden="true" />
      <span className={hideLabel ? 'sr-only' : undefined}>{currentLabel}</span>
    </button>
  );
}
