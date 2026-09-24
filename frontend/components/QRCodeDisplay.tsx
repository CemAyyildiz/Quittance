'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { copyToClipboard } from '@/lib/utils';
import { toast } from 'sonner';

interface QRCodeDisplayProps {
  value: string;
  title?: string;
  size?: number;
  showCopy?: boolean;
}

export default function QRCodeDisplay({
  value,
  title,
  size = 256,
  showCopy = true,
}: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(value);
    if (success) {
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy');
    }
  };

  // Check if value is a base64 image (from backend)
  const isBase64Image = value.startsWith('data:image');

  return (
    <div className="flex flex-col items-center gap-4">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      )}
      
      <div className="bg-white p-5 rounded-xl border-2 border-gray-200 shadow-lg">
        {isBase64Image ? (
          // Display base64 image from backend
          <img 
            src={value} 
            alt="QR Code" 
            width={size} 
            height={size}
            className="block"
          />
        ) : (
          // Generate QR code from URL
          <QRCodeSVG
            value={value}
            size={size}
            level="H"
            includeMargin={true}
          />
        )}
      </div>

      {showCopy && (
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <code className="flex-1 text-xs text-gray-700 truncate font-mono">
              {value}
            </code>
            <button
              onClick={handleCopy}
              className="btn btn-secondary p-2 shrink-0 hover:scale-105 transition-transform"
              aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" aria-hidden="true" />
              ) : (
                <Copy className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

