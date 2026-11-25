'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { invoiceApi } from '@/lib/api';
import PaymentButton from '@/components/PaymentButton';
import PaymentQrCodes from '@/components/PaymentQrCodes';
import { buildStellarPaymentUri } from '@/lib/stellar-payment-uri';
import WalletConnect from '@/components/WalletConnect';
import UserProfile from '@/components/UserProfile';
import PaymentReceipt from '@/components/PaymentReceipt';
import PaymentStatus from '@/components/PaymentStatus';
import AssetLogo from '@/components/AssetLogo';
import { formatAmount, formatDate, copyToClipboard } from '@/lib/utils';
import { useCountdown } from '@/lib/useCountdown';
import { Copy, ExternalLink, Loader2, Check, FileText, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { openInvoicePDF, shareInvoiceByEmail } from '@/lib/export';
import { extractHorizonCode, mapHorizonError } from '@/lib/horizonErrorMap';
import { loadAssetIssuerDomain } from '@/lib/stellarToml';
import { streamInvoicePayments } from '@/lib/payment-monitor';

const TX_HASH_PATTERN = /^[0-9a-fA-F]{64}$/;

const VERIFY_FIELD_BY_CODE: Record<string, string> = {
  MEMO_MISMATCH: 'memo',
  AMOUNT_MISMATCH: 'amount',
  DESTINATION_MISMATCH: 'destination',
  ASSET_MISMATCH: 'asset',
};

function describeVerifyFailure(error: any): string {
  const data = error?.response?.data;
  const field = typeof data?.code === 'string' ? VERIFY_FIELD_BY_CODE[data.code] : undefined;

  if (field) {
    return `Verification failed: the ${field} does not match this invoice.`;
  }

  if (data?.code === 'INVOICE_EXPIRED') {
    return 'This invoice has expired, so the payment cannot be verified.';
  }

  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error;
  }

  return 'Could not verify this transaction. Check the hash and try again.';
}

export default function PaymentPage() {
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [paymentInfoLoading, setPaymentInfoLoading] = useState(true);
  const [paymentInfoError, setPaymentInfoError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);
  const [issuerDomain, setIssuerDomain] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const verifiedRef = useRef(false);
  const [userWallet, setUserWallet] = useState<string | null>(null);
  const [txHash, setTxHash] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const timeRemaining = useCountdown(invoice?.status === 'PENDING' ? invoice.expiresAt : null);
  const receivedAmount = invoice?.receivedAmount ?? '0';
  const remainingAmount = invoice?.remainingAmount ?? invoice?.amount?.toString();

  useEffect(() => {
    void loadInvoice();
    void loadPaymentInfo();
  }, [id]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!invoice || invoice.assetCode === 'XLM' || !invoice.assetIssuer) {
      setIssuerDomain(null);
      return;
    }

    let active = true;
    void loadAssetIssuerDomain(invoice.assetCode, invoice.assetIssuer)
      .then((domain) => {
        if (active) setIssuerDomain(domain);
      })
      .catch((error) => {
        console.warn('Could not load asset issuer domain:', error);
        if (active) setIssuerDomain(null);
      });

    return () => {
      active = false;
    };
  }, [invoice?.assetCode, invoice?.assetIssuer]);

  useEffect(() => {
    if (!invoice || invoice.status !== 'PENDING' || !tabVisible) {
      setStreamActive(false);
      return;
    }

    let active = true;
    setStreamError(false);
    const closeStream = streamInvoicePayments(
      invoice.sellerPublicKey,
      invoice.memo,
      (txHash) => {
        void invoiceApi
          .verify(id, txHash)
          .then((result) => {
            if (!active) return;
            setInvoice(result.data);
            setPolling(false);
            toast.success('Payment confirmed!');
          })
          .catch((error) => {
            console.error('Streamed payment verification failed:', error);
          });
      },
      (error) => {
        if (!active) return;
        console.error('Payment stream error:', error);
        setStreamActive(false);
        setPolling(true);
        setStreamError(true);
        toast.error('Live payment connection dropped', {
          description: 'Checking for payment periodically.',
        });
      }
    );
    setStreamActive(true);

    return () => {
      active = false;
      closeStream();
    };
  }, [invoice?.status, invoice?.sellerPublicKey, invoice?.memo, id, tabVisible]);

  // Auto-refresh for pending invoices
  useEffect(() => {
    if (
      !invoice ||
      invoice.status !== 'PENDING' ||
      !polling ||
      streamActive ||
      !tabVisible
    ) {
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
  }, [invoice, id, polling, streamActive, tabVisible]);

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

  const handlePaymentError = (error: unknown) => {
    const code = extractHorizonCode(error);
    const resolved = mapHorizonError(
      code ?? (error as { message?: unknown })?.message,
    );
    toast.error('Payment failed', { description: resolved.message });
  };

  const handleVerifyHash = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const candidate = txHash.trim();
    setVerifyError(null);

    // Reject the obvious cases in the browser too; the API performs the same
    // check before it calls Horizon.
    if (!TX_HASH_PATTERN.test(candidate)) {
      setVerifyError('Enter a 64-character hexadecimal Stellar transaction hash.');
      return;
    }

    setVerifying(true);
    try {
      await invoiceApi.verify(id, candidate);
      verifiedRef.current = true;
      setPolling(false);
      setTxHash('');
      toast.success('Payment verified');
      await Promise.all([loadInvoice(), loadPaymentInfo()]);
    } catch (error: any) {
      setVerifyError(describeVerifyFailure(error));
    } finally {
      setVerifying(false);
    }
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
        <div className="relative" role="status">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-2xl opacity-30" aria-hidden="true"></div>
          <Loader2
            className="w-16 h-16 animate-spin text-cyan-400 relative z-10"
            aria-label="Loading payment details"
          />
          <span className="sr-only">Loading payment details</span>
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

  // The SEP-7 URI is the wallet handoff for this invoice: build it once from the
  // invoice (issuer only matters for credit assets) and prefer the API's value.
  const stellarPaymentUri =
    paymentInfo?.stellarPaymentUri ??
    buildStellarPaymentUri(
      invoice.sellerMuxedAddress ?? invoice.sellerPublicKey,
      invoice.amount.toString(),
      invoice.assetCode,
      invoice.memo,
      invoice.assetIssuer
    );

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
                      {issuerDomain && (
                        <span className="ml-2 text-sm font-medium text-gray-600">
                          {issuerDomain}
                        </span>
                      )}
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

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-600 font-semibold">Pay to</p>
                {invoice.sellerName && <p className="text-lg font-bold text-blue-800">{invoice.sellerName}</p>}
                <p className="font-mono text-sm text-blue-800" title={invoice.sellerPublicKey}>
                  {invoice.sellerPublicKey.slice(0, 8)}…{invoice.sellerPublicKey.slice(-8)}
                </p>
              </div>

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
                  {invoice.status === 'REFUNDED' && (
                    <>
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-blue-700 font-semibold">Refunded</span>
                    </>
                  )}
                  {invoice.status === 'EXPIRED' && (
                    <>
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-red-700 font-semibold">Expired</span>
                    </>
                  )}
                  {invoice.status === 'CANCELLED' && (
                    <>
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      <span className="text-gray-700 font-semibold">Voided</span>
                    </>
                  )}
                </div>
              </div>

              {invoice.status === 'PENDING' &&
                userWallet &&
                userWallet === invoice.sellerPublicKey && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4" role="alert">
                  <p className="text-sm font-semibold text-amber-900 mb-1">
                    Seller wallet connected
                  </p>
                  <p className="text-sm text-amber-800">
                    The seller cannot settle their own invoice. Share this payment link with your client.
                  </p>
                </div>
              )}

              {invoice.status === 'PENDING' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 font-semibold mb-1">Expires In</p>
                  <p className="text-blue-700 font-semibold text-lg">
                    {timeRemaining}
                  </p>
                </div>
              )}
              {streamError && (
                <p className="text-sm text-amber-700" role="status">
                  Live payment connection dropped. Checking for payment
                  periodically.
                </p>
              )}

              {invoice.status === 'PAID' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-semibold mb-1">Payment Completed</p>
                  <p className="text-green-700 font-semibold">
                    {formatDate(invoice.paidAt)}
                  </p>
                </div>
              )}
              {invoice.status === 'REFUNDED' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 font-semibold mb-1">Payment Refunded</p>
                  <p className="text-blue-700">The seller returned the full payment on Stellar{invoice.refundedAt ? ` on ${formatDate(invoice.refundedAt)}` : ''}.</p>
                </div>
              )}

              {invoice.status === 'PAID' && invoice.proofDigest && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-sm text-slate-600 font-semibold mb-1">Proof Digest</p>
                    <code className="block text-xs font-mono text-slate-900 break-all bg-white border rounded p-2">
                      {invoice.proofDigest}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyInfo(invoice.proofDigest, 'Proof digest')}
                      className="mt-2 text-xs text-cyan-700 hover:underline"
                    >
                      Copy digest
                    </button>
                  </div>
                  {invoice.proofCanonical && (
                    <div>
                      <p className="text-sm text-slate-600 font-semibold mb-1">Canonical String</p>
                      <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap break-all bg-white border rounded p-2">
                        {invoice.proofCanonical}
                      </pre>
                      <button
                        type="button"
                        onClick={() => copyInfo(invoice.proofCanonical, 'Canonical string')}
                        className="mt-2 text-xs text-cyan-700 hover:underline"
                      >
                        Copy canonical string
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {invoice.status === 'PAID' && (
              <div className="border-t pt-5 flex gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                  aria-label="Download Proof"
                >
                  <FileText className="w-4 h-4" aria-hidden="true" />
                  Download Proof
                </button>
                {invoice.customerEmail && (
                  <button
                    onClick={handleEmailShare}
                    className="btn btn-outline flex items-center justify-center gap-2 px-4"
                    title="Email Proof"
                    aria-label="Email payment proof"
                  >
                    <Mail className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}

            {invoice.status === 'REFUNDED' && (
              <PaymentStatus status="REFUNDED" txHash={invoice.refundTxHash} />
            )}

            {invoice.status === 'PENDING' && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-3 border">
                <h3 className="font-semibold text-gray-900 mb-1">Pay manually from any wallet</h3>
                <p className="text-xs text-gray-600 mb-4">
                  Send the exact amount to the destination below and include the memo. Then paste the transaction hash to confirm payment.
                </p>

                <div>
                  <p className="text-xs text-gray-600 mb-1">Destination</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-white p-2 rounded border truncate">
                      {invoice.sellerMuxedAddress ?? invoice.sellerPublicKey}
                    </code>
                    <button
                      onClick={() => copyInfo(invoice.sellerMuxedAddress ?? invoice.sellerPublicKey, 'Address')}
                      className="p-2 hover:bg-gray-200 rounded transition"
                      aria-label="Copy destination"
                    >
                      <Copy className="w-4 h-4" aria-hidden="true" />
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
                      aria-label="Copy memo"
                    >
                      <Copy className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-600 mb-1">Amount</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-white p-2 rounded border font-semibold">
                      {invoice.amount}
                    </code>
                    <button
                      onClick={() => copyInfo(invoice.amount.toString(), 'Amount')}
                      className="p-2 hover:bg-gray-200 rounded transition"
                      aria-label="Copy amount"
                    >
                      <Copy className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {invoice.status === 'PAID' && (
                  <div className="border-t pt-4 mt-4">
                    <p className="text-xs text-gray-600 mb-1">Payment Details</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Payer</p>
                        <p className="font-medium">{invoice.payerPublicKey || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Ledger</p>
                        <p className="font-medium">{invoice.ledger || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Paid At</p>
                        <p className="font-medium">{invoice.paidAt ? formatDate(invoice.paidAt) : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-600 mb-1">Asset code</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-white p-2 rounded border font-semibold">
                      {invoice.assetCode}
                    </code>
                    <button
                      onClick={() => copyInfo(invoice.assetCode, 'Asset code')}
                      className="p-2 hover:bg-gray-200 rounded transition"
                      aria-label="Copy asset code"
                    >
                      <Copy className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {invoice.assetCode !== 'XLM' && invoice.assetIssuer && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Asset issuer</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-white p-2 rounded border truncate">
                        {invoice.assetIssuer}
                      </code>
                      <button
                        onClick={() => copyInfo(invoice.assetIssuer, 'Asset issuer')}
                        className="p-2 hover:bg-gray-200 rounded transition"
                        aria-label="Copy asset issuer"
                      >
                        <Copy className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleVerifyHash} className="mt-5 pt-4 border-t border-gray-200 space-y-3">
                  <div>
                    <label htmlFor="transaction-hash" className="label">
                      Transaction hash
                    </label>
                    <input
                      id="transaction-hash"
                      type="text"
                      value={txHash}
                      onChange={(event) => {
                        setTxHash(event.target.value);
                        if (verifyError) setVerifyError(null);
                      }}
                      placeholder="Paste the 64-character transaction hash"
                      className="input font-mono text-xs"
                      autoComplete="off"
                      spellCheck={false}
                      aria-invalid={verifyError ? true : undefined}
                      aria-describedby={verifyError ? 'transaction-hash-error' : undefined}
                    />
                  </div>

                  {verifyError && (
                    <p
                      id="transaction-hash-error"
                      role="alert"
                      className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2"
                    >
                      {verifyError}
                    </p>
                  )}

                  <button type="submit" disabled={verifying} className="btn btn-primary w-full">
                    {verifying && (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    )}
                    {verifying ? 'Verifying…' : 'Verify payment'}
                  </button>
                </form>
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
                  <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-red-700 mb-2">Payment Expired</h3>
                <p className="text-gray-600">This invoice has expired</p>
              </div>
            )}

            {invoice.status === 'CANCELLED' && (
              <div className="card text-center py-8" role="status" data-testid="voided-invoice-notice">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Invoice Voided
                </h3>
                <p className="text-gray-600">
                  The seller voided this invoice, so it cannot be paid. Do not send a
                  payment for it. Contact the seller if you still owe them.
                </p>
              </div>
            )}

            {invoice.status === 'PENDING' && !invoice.paymentTxHash && (
              <>
                {Number(receivedAmount) > 0 && (
                  <div className="card" aria-live="polite">
                    <h3 className="text-lg font-semibold mb-3">Partial payment progress</h3>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-gray-500">Received</dt>
                        <dd className="font-semibold">{formatAmount(receivedAmount)} {invoice.assetCode}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Remaining</dt>
                        <dd className="font-semibold">{formatAmount(remainingAmount)} {invoice.assetCode}</dd>
                      </div>
                    </dl>
                  </div>
                )}
                <div className="card">
                  <h3 className="text-lg font-semibold text-center mb-4">Scan QR Code</h3>
                  {paymentInfoLoading ? (
                    <div className="min-h-48 flex flex-col items-center justify-center gap-3 text-gray-600" role="status">
                      <Loader2
                        className="w-8 h-8 animate-spin text-cyan-500"
                        aria-label="Loading payment QR"
                      />
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
                        <RefreshCw className="w-4 h-4" aria-hidden="true" />
                        Retry QR
                      </button>
                    </div>
                  ) : (
                    <PaymentQrCodes
                      paymentUrl={paymentInfo.paymentUrl}
                      stellarPaymentUri={stellarPaymentUri}
                      size={220}
                    />
                  )}
                </div>

                <div className="card">
                  <h3 className="text-lg font-semibold text-center mb-2">
                    SEP-7 payment URI
                  </h3>
                  <p className="text-sm text-gray-600 text-center mb-4">
                    Open this invoice in a wallet that supports SEP-0007.
                  </p>
                  <p className="text-xs text-gray-600 text-center mb-4">
                    Pay before {formatDate(invoice.expiresAt)}. When paying manually, set the
                    transaction max time to that deadline; later or unbounded payments are
                    rejected.
                  </p>
                  <code className="block text-xs font-mono text-gray-700 break-all bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                    {stellarPaymentUri}
                  </code>
                  <a
                    href={stellarPaymentUri}
                    className="btn btn-primary w-full inline-flex items-center justify-center gap-2"
                    aria-label="Open SEP-7 payment URI in a Stellar wallet"
                  >
                    <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    Open in Stellar wallet
                  </a>
                  {paymentInfo?.paymentUrl && (
                    <p className="text-xs text-gray-500 text-center mt-4">
                      No wallet handler?{' '}
                      <a
                        href={paymentInfo.paymentUrl}
                        className="text-cyan-700 underline font-medium"
                      >
                        Use the web payment link
                      </a>
                    </p>
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
                    amount={remainingAmount}
                    memo={invoice.memo}
                    assetCode={invoice.assetCode}
                    assetIssuer={invoice.assetIssuer}
                    invoiceId={invoice.id}
                    expiresAt={invoice.expiresAt}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
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

