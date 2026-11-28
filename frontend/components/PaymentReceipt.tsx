'use client';

import { formatAmount } from '@/lib/utils';
import { formatUtc } from '@/lib/formatUtc';
import { explorerTxUrl } from '@/lib/explorerUrl';
import { Check, Download, ExternalLink, FileText, Mail } from 'lucide-react';
import AssetLogo from './AssetLogo';
import { openInvoicePDF, shareInvoiceByEmail } from '@/lib/export';
import { toast } from 'sonner';
import CopyButton from './CopyButton';

interface PaymentReceiptProps {
  invoice: any;
  showProofActions?: boolean;
}

export default function PaymentReceipt({
  invoice,
  showProofActions = true,
}: PaymentReceiptProps) {
  const paymentHash = invoice.paymentTxHash;
  if (invoice.status !== 'PAID' || typeof paymentHash !== 'string' || !/^[0-9a-fA-F]{64}$/.test(paymentHash)) {
    return null;
  }

  const handleDownloadPDF = () => {
    openInvoicePDF(invoice as any);
    toast.success('Opening payment proof');
  };

  const handleEmailProof = () => {
    if (!invoice.customerEmail) {
      toast.error('No client email on this invoice');
      return;
    }
    shareInvoiceByEmail(invoice as any);
  };

  const handleDownload = () => {
    const receiptText = `
═══════════════════════════════════════
          PAYMENT RECEIPT
═══════════════════════════════════════

Invoice ID: ${invoice.id}
Status: ${invoice.status}
Payment Date (UTC): ${formatUtc(invoice.paidAt)}

───────────────────────────────────────
PAYMENT DETAILS
───────────────────────────────────────

Amount Paid: ${formatAmount(invoice.amount, 7)} ${invoice.assetCode}
${invoice.description ? `Description: ${invoice.description}` : ''}
${invoice.customerName ? `Customer: ${invoice.customerName}` : ''}
${invoice.customerEmail ? `Email: ${invoice.customerEmail}` : ''}

───────────────────────────────────────
TRANSACTION DETAILS
───────────────────────────────────────

Transaction Hash:
${invoice.paymentTxHash}

From (Payer):
${invoice.payerPublicKey || 'N/A'}

To (Recipient):
${invoice.sellerPublicKey}

Memo: ${invoice.memo}

───────────────────────────────────────
Powered by Quittance
Stellar Blockchain Payment System
═══════════════════════════════════════
    `.trim();

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${invoice.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card print:shadow-none" id="payment-receipt">
      <div className="text-center mb-6 border-b pb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <Check aria-hidden="true" className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment Receipt</h2>
        <p className="text-green-600 font-semibold text-lg">Payment Confirmed</p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-600 mb-3">Amount Paid</p>
          <div className="flex items-center justify-center gap-3">
            <AssetLogo code={invoice.assetCode} size={36} showName={false} priority={true} />
            <div>
              <p className="text-4xl font-bold text-green-700">
                {formatAmount(invoice.amount, 7)}
              </p>
              <p className="text-lg font-semibold text-green-600 mt-1">
                {invoice.assetCode}
              </p>
            </div>
          </div>
        </div>

        {invoice.description && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">Payment For</p>
            <p className="text-gray-800 font-medium">{invoice.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">Invoice ID</p>
            <p className="text-sm font-mono text-gray-900 break-all">{invoice.id}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">Payment Date (UTC)</p>
            <p className="text-sm text-gray-900">{formatUtc(invoice.paidAt)}</p>
          </div>
        </div>

        {invoice.sellerName && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-600 font-semibold">Paid to</p>
            <p className="text-lg font-bold text-blue-800">{invoice.sellerName}</p>
            {invoice.sellerEmail && (
              <p className="text-sm text-blue-600">{invoice.sellerEmail}</p>
            )}
          </div>
        )}

        {(invoice.payerName || invoice.payerEmail) && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-sm text-green-600 font-semibold">Paid by</p>
            {invoice.payerName && (
              <p className="text-lg font-bold text-green-800">{invoice.payerName}</p>
            )}
            {invoice.payerEmail && (
              <p className="text-sm text-green-600">{invoice.payerEmail}</p>
            )}
          </div>
        )}
      </div>

      <div className="border-t pt-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Details</h3>
        
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs text-gray-600">Transaction Hash</p>
              <CopyButton
                text={paymentHash}
                label="Copy hash"
                copiedLabel="Hash copied"
                className="text-cyan-700 print:hidden"
              />
            </div>
            <p className="text-xs font-mono text-gray-900 break-all select-all">{paymentHash}</p>
          </div>

          {invoice.payerPublicKey && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">From (Payer Address)</p>
              <p className="text-xs font-mono text-gray-900 break-all">{invoice.payerPublicKey}</p>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">To (Recipient Address)</p>
            <p className="text-xs font-mono text-gray-900 break-all">{invoice.sellerPublicKey}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">Memo</p>
            <p className="text-sm font-mono text-gray-900">{invoice.memo}</p>
          </div>
        </div>
      </div>

      <div className="border-t pt-6 space-y-3 print:hidden">
        {showProofActions && invoice.status === 'PAID' && (
          <button
            onClick={handleDownloadPDF}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            <FileText aria-hidden="true" className="w-5 h-5" />
            Download Proof
          </button>
        )}

        {showProofActions && invoice.status === 'PAID' && invoice.customerEmail && (
          <button
            onClick={handleEmailProof}
            className="btn btn-secondary w-full flex items-center justify-center gap-2"
          >
            <Mail aria-hidden="true" className="w-5 h-5" />
            Email Proof
          </button>
        )}

        <a
          href={explorerTxUrl(invoice.paymentTxHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline w-full flex items-center justify-center gap-2"
        >
          <ExternalLink aria-hidden="true" className="w-5 h-5" />
          View on Stellar Explorer
        </a>

        <button
          onClick={handleDownload}
          className="btn btn-outline w-full flex items-center justify-center gap-2 text-sm"
        >
          <Download aria-hidden="true" className="w-4 h-4" />
          Download TXT receipt
        </button>
      </div>

      <div className="text-center mt-6 pt-6 border-t">
        <p className="text-xs text-gray-500">
          This receipt confirms payment on the Stellar blockchain
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Powered by Quittance
        </p>
      </div>
    </div>
  );
}

