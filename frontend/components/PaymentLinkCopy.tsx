'use client';

import CopyButton from '@/components/CopyButton';
import { toast } from 'sonner';

interface PaymentLinkCopyProps {
  url: string;
}

export default function PaymentLinkCopy({ url }: PaymentLinkCopyProps) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-2">Payment link</h3>
      <div className="flex items-center gap-3">
        <a
          href={url}
          className="min-w-0 flex-1 break-all font-mono text-sm text-cyan-700 underline"
        >
          {url}
        </a>
        <CopyButton
          text={url}
          label="Copy"
          ariaLabel="Copy payment link"
          className="btn btn-outline shrink-0"
          onCopy={(success) => {
            if (success) {
              toast.success('Payment link copied');
            } else {
              toast.error('Could not copy payment link. Copy the URL shown here.');
            }
          }}
        />
      </div>
    </div>
  );
}
