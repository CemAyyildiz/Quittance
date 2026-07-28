'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { copyToClipboard } from '@/lib/utils';
import { toast } from 'sonner';

interface QRCodeDisplayProps {
  /** HTTPS payment URL or SEP-0007 URI to encode in the QR and copy — never a data URL. */
  value: string;
  title?: string;
  size?: number;
  showCopy?: boolean;
}

function isNonShareablePayload(value: string): boolean {
  return value.startsWith('data:');
}

export default function QRCodeDisplay({
  value,
  title,
  size = 256,
  showCopy = true,
}: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const shareable = !isNonShareablePayload(value);

  const handleCopy = async () => {
    if (!shareable) {
      toast.error('Nothing shareable to copy');
      return;
    }
    const success = await copyToClipboard(value);
    if (success) {
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      )}

      <div className="bg-white p-5 rounded-xl border-2 border-gray-200 shadow-lg">
        {shareable ? (
          <QRCodeSVG
            value={value}
            size={size}
            level="H"
            includeMargin={true}
          />
        ) : (
          <p className="text-sm text-red-600 text-center px-4 py-8 max-w-xs">
            QR preview unavailable. Use payment link or SEP-0007 URI from the API.
          </p>
        )}
      </div>

      {showCopy && shareable && (
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <code className="flex-1 text-xs text-gray-700 truncate font-mono">
              {value}
            </code>
            <button
              onClick={handleCopy}
              className="btn btn-secondary p-2 shrink-0 hover:scale-105 transition-transform"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
