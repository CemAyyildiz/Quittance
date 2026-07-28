'use client';

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { cn, copyToClipboard } from '@/lib/utils';

export interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  iconOnly?: boolean;
  timeout?: number;
}

export default function CopyButton({
  text,
  label = 'Copy',
  className,
  iconOnly = false,
  timeout = 2000,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 text-sm transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] focus-visible:ring-offset-2',
        iconOnly ? 'p-1.5' : 'px-3 py-1.5',
        className,
      )}
      aria-label={copied ? 'Copied' : `Copy ${text}`}
      title={copied ? 'Copied' : label}
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-600" aria-hidden="true" />
      ) : (
        <Copy className="w-4 h-4" aria-hidden="true" />
      )}
      {!iconOnly && (
        <span>{copied ? 'Copied' : label}</span>
      )}
    </button>
  );
}
