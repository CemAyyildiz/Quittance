'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { invoiceApi } from '@/lib/api';
import PaymentButton from '@/components/PaymentButton';
import PaymentQrCodes from '@/components/PaymentQrCodes';
import { buildStellarPaymentUri } from '@/lib/stellar-payment-uri';
import WalletConnect from '@/components/WalletConnect';
import UserProfile from '@/components/UserProfile';
import PaymentReceipt from '@/components/PaymentReceipt';
import AssetLogo from '@/components/AssetLogo';
import { formatAmount, formatDate, copyToClipboard } from '@/lib/utils';
import { useCountdown } from '@/lib/useCountdown';
import { Copy, ExternalLink, Loader2, Check, FileText, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { openInvoicePDF, shareInvoiceByEmail } from '@/lib/export';

export default function PaymentPage() {
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [paymentInfoLoading, setPaymentInfoLoading] = useState(true);
  const [paymentInfoError, setPaymentInfoError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);
  const verifiedRef = useRef(false);
  const [userWallet, setUserWallet] = useState<string | null>(null);
  const timeRemaining = useCountdown(invoice?.status === 'PENDING' ? invoice.expiresAt : null);

  useEffect(() => {
    void loadInvoice();
    void loadPaymentInfo();
  }, [id]);

  // Auto-refresh for pending invoices
  useEffect(() => {
    if (!invoice || invoice.status !== 'PENDING' || !polling) {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const result = await invoiceApi.getById(id);
        if (result.data.status !== 'PENDING') {
          setInvoice(result.data);
          setPolling(false);
          if (result.data.status === 'PAID' && !verifiedRef.current) {
            toast.success('Payment confirmed!');
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(intervalId);
  }, [invoice, id, polling]);

  const loadInvoice = async () => {
    try {
      const invoiceResult = await invoiceApi.getById(id);
      setInvoice(invoiceResult.data);
    } catch (error: any) {
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentInfo = async () => {
    setPaymentInfoLoading(true);
    setPaymentInfoError(null);
    try {
      const paymentResult = await invoiceApi.getPaymentInfo(id);
      setPaymentInfo(paymentResult.data);
    } catch (error: any) {
      setPaymentInfo(null);
      setPaymentInfoError('Payment QR is unavailable right now.');
    } finally {
      setPaymentInfoLoading(false);
    }
  };

  const handlePaymentSuccess = async (txHash: string) => {
    verifiedRef.current = true;
    setPolling(true);
    setTimeout(async () => {
      await loadInvoice();
      await loadPaymentInfo();
    }, 2000);
  };

  const copyInfo = async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      toast.success(`${label} copied`);
    }
  };

  const handleDownloadPDF = () => {
    if (invoice) {
      openInvoicePDF(invoice as any);
      toast.success('Opening payment proof');
    }
  };

  const handleEmailShare = () => {
    if (!invoice) return;
    if (!invoice.customerEmail) {
      toast.error('No client email on this invoice');
      return;
    }
    shareInvoiceByEmail(invoice as any);
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
          <p className="text-gray-700">The invoice you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const horizonUrl =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'TESTNET'
      ? 'https://stellar.expert/explorer/testnet'
      : 'https://stellar.expert/explorer/public';

  return (
    <div className="min-h-screen bg-logo-pattern relative py-8 sm:py-12 px-4">
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>
      <div className="max-w-4xl mx-auto relative z-10">
        <header className="fixed top-0 left-0 right-0 z-50 premium-header border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="font-display text-2xl tracking-tight text-[var(--ink)]">
                Quittance
              </span>
            </Link>
            <div className="flex items-center gap-3">
              {!userWallet ? (
                <WalletConnect onConnect={setUserWallet} />
              ) : (
                <UserProfile userWallet={userWallet} onDisconnect={() => setUserWallet(null)} />
              )}
            </div>
          </div>
        </header>

        <div className="pt-20">
        <div className="text-center mb-10 sm:mb-12">
          <div className="inline-block mb-4 px-6 py-2 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 backdrop-blur-md rounded-full border border-white/30">
            <span className="text-white text-sm font-semibold tracking-wide">Secure Payment</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2 sm:mb-3">Complete Payment</h1>
          <p className="text-xl text-white/90">Pay with your Stellar wallet</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="card">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Payment Details</h2>

            <div className="space-y-5 mb-8">
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200/50 rounded-2xl p-8 text-center shadow-lg">
                <p className="text-sm text-gray-600 mb-4 font-semibold uppercase tracking-wide">Amount to Pay</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-lg opacity-40"></div>
                    <AssetLogo code={invoice.assetCode} size={50} showName={false} priority={true} />
                  </div>
                  <div>
                    <p className="text-4xl sm:text-6xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent break-all">
                      {formatAmount(invoice.amount, 7)}
                    </p>
                    <p className="text-xl font-bold text-cyan-600 mt-2">
                      {invoice.assetCode}
                    </p>
                  </div>
                </div>
              </div>

              {invoice.description && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Payment For</p>
                  <p className="text-gray-800 font-medium">{invoice.description}</p>
                </div>
              )}

              {invoice.sellerName && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-blue-600 font-semibold">Pay to</p>
                  <p className="text-lg font-bold text-blue-800">{invoice.sellerName}</p>
                  {invoice.sellerEmail && (
                    <p className="text-sm text-blue-600">{invoice.sellerEmail}</p>
                  )}
                </div>
              )}

              <div className="border-b pb-4">
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <div className="inline-flex items-center gap-2 mt-1">
                  {invoice.status === 'PENDING' && (
                    <>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span className="text-yellow-700 font-semibold">Waiting for Payment</span>
                    </>
                  )}
                  {invoice.status === 'PAID' && (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-700 font-semibold">Paid</span>
                    </>
                  )}
                  {invoice.status === 'EXPIRED' && (
                    <>
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-red-700 font-semibold">Expired</span>
                    </>
                  )}
                </div>
              </div>

              {invoice.status === 'PENDING' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 font-semibold mb-1">Expires In</p>
                  <p className="text-blue-700 font-semibold text-lg">
                    {timeRemaining}
                  </p>
                </div>
              )}

              {invoice.status === 'PAID' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-semibold mb-1">Payment Completed</p>
                  <p className="text-green-700 font-semibold">
                    {formatDate(invoice.paidAt)}
                  </p>
                </div>
              )}
            </div>

            {invoice.status === 'PAID' && (
              <div className="border-t pt-5 flex gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Download Proof
                </button>
                {invoice.customerEmail && (
                  <button
                    onClick={handleEmailShare}
                    className="btn btn-outline flex items-center justify-center gap-2 px-4"
                    title="Email Proof"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {invoice.status === 'PENDING' && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-3 border">
                <h3 className="font-semibold text-gray-900 mb-3">Payment Information</h3>
                
                <div>
                  <p className="text-xs text-gray-600 mb-1">Destination Address</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-white p-2 rounded border truncate">
                      {invoice.sellerPublicKey}
                    </code>
                    <button
                      onClick={() => copyInfo(invoice.sellerPublicKey, 'Address')}
                      className="p-2 hover:bg-gray-200 rounded transition"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-600 mb-1">Memo (Required)</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-white p-2 rounded border font-semibold">
                      {invoice.memo}
                    </code>
                    <button
                      onClick={() => copyInfo(invoice.memo, 'Memo')}
                      className="p-2 hover:bg-gray-200 rounded transition"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-600 mb-1">Exact Amount</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-white p-2 rounded border font-semibold">
                      {invoice.amount} {invoice.assetCode}
                    </code>
                    <button
                      onClick={() => copyInfo(invoice.amount.toString(), 'Amount')}
                      className="p-2 hover:bg-gray-200 rounded transition"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {invoice.status === 'PAID' && (
              <PaymentReceipt invoice={invoice} />
            )}

            {invoice.status === 'EXPIRED' && (
              <div className="card text-center py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                  <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-red-700 mb-2">Payment Expired</h3>
                <p className="text-gray-600">This invoice has expired</p>
              </div>
            )}

            {invoice.status === 'PENDING' && !invoice.paymentTxHash && (
              <>
                <div className="card">
                  <h3 className="text-lg font-semibold text-center mb-4">Scan QR Code</h3>
                  {paymentInfoLoading ? (
                    <div className="min-h-48 flex flex-col items-center justify-center gap-3 text-gray-600">
                      <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                      <p className="text-sm">Loading payment QR…</p>
                    </div>
                  ) : paymentInfoError || !paymentInfo ? (
                    <div className="min-h-48 flex flex-col items-center justify-center gap-4 rounded-lg border border-amber-200 bg-amber-50 p-5 text-center">
                      <p className="text-sm text-amber-800">
                        {paymentInfoError || 'Payment QR is not available for this invoice.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => void loadPaymentInfo()}
                        className="btn btn-outline inline-flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Retry QR
                      </button>
                    </div>
                  ) : (
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
                      size={220}
                    />
                  )}
                </div>

                <div className="card">
                  <h3 className="text-xl font-semibold text-center mb-4">Pay with Wallet</h3>

                  <div className="hidden sm:block bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800 font-semibold mb-2">How to Pay:</p>
                    <ol className="text-sm text-blue-700 space-y-1.5 list-decimal list-inside">
                      <li>Connect your Freighter wallet</li>
                      <li>Click Pay with Freighter</li>
                      <li>Confirm the transaction</li>
                    </ol>
                  </div>

                  <div className="flex justify-center mb-4">
                    <WalletConnect onConnect={setUserWallet} />
                  </div>

                  <PaymentButton
                    destination={invoice.sellerPublicKey}
                    amount={invoice.amount.toString()}
                    memo={invoice.memo}
                    assetCode={invoice.assetCode}
                    assetIssuer={invoice.assetIssuer}
                    invoiceId={invoice.id}
                    onSuccess={handlePaymentSuccess}
                  />

                  <div className="mt-6 pt-4 border-t text-center">
                    <p className="text-xs text-gray-500">Secure payment on Stellar blockchain</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        </div>
      </div>
    </div>
  );
}

