'use client';

import { Copy, Check } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn, copyToClipboard } from '@/lib/utils';

export interface CopyButtonProps {
  text: string;
  label?: string;
  /** Label shown briefly after a successful copy. @default 'Copied' */
  copiedLabel?: string;
  /** Accessible name override. Defaults to the visible label text (not the raw copied value). */
  ariaLabel?: string;
  className?: string;
  iconOnly?: boolean;
  timeout?: number;
  /** Disables the button and prevents copying. @default false */
  disabled?: boolean;
  /** Called after each copy attempt with whether it succeeded. */
  onCopy?: (success: boolean) => void;
  /** Custom test id for querying in tests. */
  'data-testid'?: string;
}

/**
 * Falls back to a hidden textarea + execCommand when the async Clipboard
 * API is unavailable (e.g. non-secure/http contexts, some embedded webviews).
 */
function writeToClipboardFallback(text: string): boolean {
  if (typeof document === 'undefined') return false;

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

export default function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied',
  ariaLabel,
  className,
  iconOnly = false,
  timeout = 2000,
  disabled = false,
  onCopy,
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

    let success = await copyToClipboard(text);
    if (!success && typeof navigator !== 'undefined' && !navigator.clipboard) {
      success = writeToClipboardFallback(text);
    }

    if (success) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setCopied(true);
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
        timeoutRef.current = null;
      }, timeout);
    }

    onCopy?.(success);
  }, [disabled, onCopy, text, timeout]);

  const currentLabel = copied ? copiedLabel : label;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      data-testid={testId}
      className={cn(
        'inline-flex items-center gap-1.5 text-sm transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        iconOnly ? 'p-1.5' : 'px-3 py-1.5',
        className,
      )}
      aria-label={ariaLabel ?? currentLabel}
      title={currentLabel}
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-600" aria-hidden="true" />
      ) : (
        <Copy className="w-4 h-4" aria-hidden="true" />
      )}
      {!iconOnly && <span>{currentLabel}</span>}
    </button>
  );
}
