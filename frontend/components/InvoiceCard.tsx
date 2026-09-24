'use client';

import Link from 'next/link';
import { formatAmount, formatDate, getStatusColor } from '@/lib/utils';
import { useCountdown } from '@/lib/useCountdown';
import { Clock, ExternalLink, Copy, Mail, Download } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';
import { toast } from 'sonner';
import AssetLogo from './AssetLogo';
import MemoChip from './MemoChip';
import { openInvoicePDF, shareInvoiceByEmail } from '@/lib/export';
import { invoiceStatusLabel } from '@/lib/invoiceStatusLabel';

interface Invoice {
  id: string;
  amount: number;
  assetCode: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  memo: string;
  sellerPublicKey?: string;
  sellerName?: string;
  sellerEmail?: string;
  payerPublicKey?: string;
  payerName?: string;
  payerEmail?: string;
  paymentTxHash?: string;
  paidAt?: string;
}

interface InvoiceCardProps {
  invoice: Invoice;
}

export default function InvoiceCard({ invoice }: InvoiceCardProps) {
  const statusColor = getStatusColor(invoice.status);
  const paymentUrl = `${window.location.origin}/pay/${invoice.id}`;
  const timeRemaining = useCountdown(invoice.status === 'PENDING' ? invoice.expiresAt : null);

  const handleCopyLink = async () => {
    const success = await copyToClipboard(paymentUrl);
    if (success) {
      toast.success('Invoice link copied');
    }
  };

  const handleDownloadPDF = () => {
    openInvoicePDF(invoice as any);
    toast.success('Opening payment proof');
  };

  const handleEmailShare = () => {
    shareInvoiceByEmail(invoice as any);
  };

  return (
    <div className="card hover:shadow-xl group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <AssetLogo code={invoice.assetCode} size={24} showName={false} />
            <h3 className="text-lg font-bold text-gray-900">
              {formatAmount(invoice.amount)} <span className="text-cyan-600">{invoice.assetCode}</span>
            </h3>
          </div>
          {invoice.customerName && (
            <p className="text-sm text-gray-600">{invoice.customerName}</p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${statusColor}`}>
          {invoiceStatusLabel(invoice.status)}
        </span>
      </div>

      {invoice.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {invoice.description}
        </p>
      )}

      <div className="mb-4">
        <MemoChip memo={invoice.memo} />
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-4 h-4" />
          <span>Created: {formatDate(invoice.createdAt)}</span>
        </div>
        {invoice.status === 'PENDING' && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-4 h-4" />
            <span>Expires: {timeRemaining}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Link
          href={`/invoice/${invoice.id}`}
          className="btn btn-outline flex-1 flex items-center justify-center gap-2 text-sm"
        >
          <ExternalLink className="w-4 h-4" />
          View
        </Link>
        {invoice.status === 'PENDING' && (
          <button
            onClick={handleCopyLink}
            className="btn btn-secondary flex items-center justify-center gap-2 px-3"
          >
            <Copy className="w-4 h-4" />
          </button>
        )}
        {invoice.status === 'PAID' && (
          <button
            onClick={handleDownloadPDF}
            className="btn btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Download Proof
          </button>
        )}
        {invoice.status === 'PAID' && invoice.customerEmail && (
          <button
            onClick={handleEmailShare}
            className="btn btn-outline flex items-center justify-center gap-2 px-3"
            title="Email Proof"
          >
            <Mail className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

