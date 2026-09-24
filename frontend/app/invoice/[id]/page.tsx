'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { invoiceApi } from '@/lib/api';
import PaymentQrCodes from '@/components/PaymentQrCodes';
import { buildStellarPaymentUri } from '@/lib/stellar-payment-uri';
import PaymentStatus from '@/components/PaymentStatus';
import WalletConnect from '@/components/WalletConnect';
import UserProfile from '@/components/UserProfile';
import PaymentReceipt from '@/components/PaymentReceipt';
import AssetLogo from '@/components/AssetLogo';
import { formatAmount, formatDate, copyToClipboard } from '@/lib/utils';
import { openInvoicePDF } from '@/lib/export';
import { useCountdown } from '@/lib/useCountdown';
import { ArrowLeft, Share2, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userWallet, setUserWallet] = useState<string | null>(null);
  const timeRemaining = useCountdown(invoice?.status === 'PENDING' ? invoice.expiresAt : null);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    try {
      const [invoiceResult, paymentResult] = await Promise.all([
        invoiceApi.getById(id),
        invoiceApi.getPaymentInfo(id),
      ]);

      setInvoice(invoiceResult.data);
      setPaymentInfo(paymentResult.data);
    } catch (error) {
      toast.error('Failed to load invoice');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentShareUrl = () => `${window.location.origin}/pay/${invoice.id}`;

  const handleShare = async () => {
    const url = getPaymentShareUrl();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Quittance Invoice',
          text: `Pay ${invoice.amount} ${invoice.assetCode}`,
          url,
        });
      } catch {
        // User cancelled share
      }
    } else {
      const success = await copyToClipboard(url);
      if (success) {
        toast.success('Invoice link copied');
      }
    }
  };

  const handleDownloadProof = () => {
    openInvoicePDF(invoice);
    toast.success('Opening payment proof');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-logo-pattern relative flex items-center justify-center">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-2xl opacity-30"></div>
          <Loader2 className="w-16 h-16 animate-spin text-cyan-400 relative z-10" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-logo-pattern relative flex items-center justify-center">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="card text-center max-w-md relative z-10">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Invoice Not Found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-logo-pattern relative py-8 sm:py-12 px-4">
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="fixed top-0 left-0 right-0 z-50 premium-header border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="btn btn-outline flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <Link href="/" className="hover:opacity-90 transition-opacity">
                <span className="font-display text-xl tracking-tight text-[var(--ink)]">Quittance</span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {!userWallet ? (
                <WalletConnect onConnect={setUserWallet} />
              ) : (
                <UserProfile userWallet={userWallet} onDisconnect={() => setUserWallet(null)} />
              )}
              {invoice.status === 'PENDING' && (
                <button
                  onClick={handleShare}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              )}
              {invoice.status === 'PAID' && (
                <button
                  onClick={handleDownloadProof}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  <span className="hidden sm:inline">Download Proof</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="card">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Invoice Details</h2>

              <div className="space-y-5">
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-5 rounded-2xl border border-gray-200/50">
                  <p className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wide">Invoice ID</p>
                  <p className="font-mono text-sm text-gray-900 break-all">{invoice.id}</p>
                </div>

                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-6 rounded-2xl border-2 border-cyan-200/50 shadow-lg">
                  <p className="text-xs text-gray-600 mb-3 font-semibold uppercase tracking-wide">Amount</p>
                  <div className="flex items-center gap-3">
                    <AssetLogo code={invoice.assetCode} size={40} showName={false} />
                    <p className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                      {formatAmount(invoice.amount, 7)}{' '}
                      <span className="text-2xl">{invoice.assetCode}</span>
                    </p>
                  </div>
                </div>

                {invoice.status === 'PAID' && (
                  <button
                    type="button"
                    onClick={handleDownloadProof}
                    className="btn btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download Proof
                  </button>
                )}

                {invoice.description && (
                  <div className="border-b pb-4">
                    <p className="text-sm text-gray-600 mb-1">Description</p>
                    <p className="text-gray-900">{invoice.description}</p>
                  </div>
                )}

                {invoice.customerName && (
                  <div className="border-b pb-4">
                    <p className="text-sm text-gray-600 mb-1">Client</p>
                    <p className="text-gray-900">{invoice.customerName}</p>
                  </div>
                )}

                {invoice.customerEmail && (
                  <div className="border-b pb-4">
                    <p className="text-sm text-gray-600 mb-1">Client Email</p>
                    <p className="text-gray-900">{invoice.customerEmail}</p>
                  </div>
                )}

                <div className="border-b pb-4">
                  <p className="text-sm text-gray-600 mb-1">Memo</p>
                  <p className="font-mono text-sm text-gray-900">{invoice.memo}</p>
                </div>

                <div className="border-b pb-4">
                  <p className="text-sm text-gray-600 mb-1">Created</p>
                  <p className="text-gray-900">{formatDate(invoice.createdAt)}</p>
                </div>

                {invoice.status === 'PENDING' && (
                  <div className="border-b pb-4">
                    <p className="text-sm text-gray-600 mb-1">Expires In</p>
                    <p className="text-gray-900 font-semibold">
                      {timeRemaining}
                    </p>
                  </div>
                )}

                {invoice.paidAt && (
                  <div className="border-b pb-4">
                    <p className="text-sm text-gray-600 mb-1">Paid At</p>
                    <p className="text-gray-900">{formatDate(invoice.paidAt)}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {invoice.status !== 'PAID' && (
                <PaymentStatus status={invoice.status} txHash={invoice.paymentTxHash} />
              )}

              {invoice.status === 'PAID' && (
                <PaymentReceipt invoice={invoice} />
              )}

              {invoice.status === 'PENDING' && paymentInfo && (
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4 text-center">
                    Payment QR Code
                  </h3>
                  <PaymentQrCodes
                    paymentUrl={paymentInfo.paymentUrl}
                    stellarPaymentUri={
                      paymentInfo.stellarPaymentUri ??
                      buildStellarPaymentUri(
                        invoice.sellerPublicKey,
                        invoice.amount.toString(),
                        invoice.assetCode,
                        invoice.memo,
                        invoice.assetIssuer
                      )
                    }
                    size={200}
                  />
                  <Link
                    href={`/pay/${invoice.id}`}
                    className="btn btn-primary w-full mt-4"
                  >
                    Go to Payment Page
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
