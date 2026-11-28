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
import StatusHistory, { type StatusHistoryRow } from '@/components/StatusHistory';
import AssetLogo from '@/components/AssetLogo';
import { formatAmount, formatDate, copyToClipboard } from '@/lib/utils';
import { formatUtc } from '@/lib/formatUtc';
import { openInvoicePDF } from '@/lib/export';
import { submitAnchorTransaction } from '@/lib/anchor';
import { useCountdown } from '@/lib/useCountdown';
import { ArrowLeft, Share2, Loader2, Download, Copy, Ban } from 'lucide-react';
import { toast } from 'sonner';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [voiding, setVoiding] = useState(false);
  const [userWallet, setUserWallet] = useState<string | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [copyCustomerEmail, setCopyCustomerEmail] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [anchoring, setAnchoring] = useState(false);
  const [refundTxHash, setRefundTxHash] = useState('');
  const [refunding, setRefunding] = useState(false);
  const timeRemaining = useCountdown(invoice?.status === 'PENDING' ? invoice.expiresAt : null);
  const isSeller =
    Boolean(userWallet) &&
    Boolean(invoice) &&
    userWallet!.toLowerCase() === String(invoice?.sellerPublicKey ?? '').toLowerCase();

  useEffect(() => {
    loadInvoice();
  }, [id]);

  useEffect(() => {
    if (!invoice || invoice.status !== 'PENDING') return;
    const intervalId = setInterval(() => {
      void loadInvoice();
    }, 3000);
    return () => clearInterval(intervalId);
  }, [id, invoice?.status]);

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

  const handleRefund = async () => {
    if (!userWallet || userWallet !== invoice.sellerPublicKey || !refundTxHash.trim()) return;
    setRefunding(true);
    try {
      const result = await invoiceApi.refund(id, {
        sellerPublicKey: userWallet,
        refundTxHash: refundTxHash.trim(),
      });
      setInvoice(result.data);
      setRefundTxHash('');
      toast.success('Refund verified on Stellar');
    } catch (error: any) {
      toast.error(error.response?.data?.error ?? 'Refund could not be verified');
    } finally {
      setRefunding(false);
    }
  };

  const handleVoidInvoice = async () => {
    if (!userWallet || !isSeller || invoice.status !== 'PENDING' || voiding) return;
    setVoiding(true);
    try {
      const result = await invoiceApi.cancel(id, userWallet);
      setInvoice(result.data);
      toast.success('Invoice voided');
    } catch (error: any) {
      toast.error(error.response?.data?.error ?? 'Could not void invoice');
    } finally {
      setVoiding(false);
    }
  };

  const handleDuplicate = async () => {
    if (!userWallet || !isSeller || duplicating) return;
    setDuplicating(true);
    try {
      const result = await invoiceApi.duplicate(id, {
        sellerPublicKey: userWallet,
        copyCustomerEmail,
      });
      const duplicatedInvoice = result.data?.invoice;
      if (!duplicatedInvoice?.id) {
        throw new Error('The duplicated invoice response is invalid');
      }
      setDuplicateOpen(false);
      toast.success('Invoice duplicated');
      router.push(`/invoice/${duplicatedInvoice.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error ?? error.message ?? 'Could not duplicate invoice');
    } finally {
      setDuplicating(false);
    }
  };

  const handleAnchorProof = async () => {
    if (!userWallet || !isSeller || invoice.status !== 'PAID' || anchoring) return;
    setAnchoring(true);
    try {
      const digestResult = await invoiceApi.getProofDigest(id, userWallet);
      const digest = digestResult.data?.digest;
      if (typeof digest !== 'string' || !digest) {
        throw new Error('Could not compute the invoice proof digest');
      }

      const preparedResult = await invoiceApi.prepareAnchorProof(id, digest, userWallet);
      const contractId = preparedResult.data?.contractId;
      if (typeof contractId !== 'string' || !contractId) {
        throw new Error('Receipt anchoring contract is not configured');
      }

      const txHash = await submitAnchorTransaction(contractId, id, digest);
      const result = await invoiceApi.anchorProof(id, {
        digest,
        txHash,
        sellerPublicKey: userWallet,
      });
      setInvoice(result.data);
      toast.success('Proof anchored on chain');
    } catch (error: any) {
      toast.error(error.response?.data?.error ?? error.message ?? 'Could not anchor proof');
    } finally {
      setAnchoring(false);
    }
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
            aria-label="Loading invoice details"
          />
          <span className="sr-only">Loading invoice details</span>
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
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
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
                  aria-label="Share"
                >
                  <Share2 className="w-5 h-5" aria-hidden="true" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              )}
              {invoice.status === 'PENDING' &&
                userWallet === invoice.sellerPublicKey && (
                  <button
                    type="button"
                    onClick={() => void handleVoidInvoice()}
                    disabled={voiding}
                    className="btn btn-outline flex items-center gap-2 text-red-700"
                  >
                    {voiding ? (
                      <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Ban className="w-5 h-5" aria-hidden="true" />
                    )}
                    <span>Void Invoice</span>
                  </button>
                )}
              {invoice.status === 'PAID' && (
                <button
                  onClick={handleDownloadProof}
                  className="btn btn-primary flex items-center gap-2"
                  aria-label="Download Proof"
                >
                  <Download className="w-5 h-5" aria-hidden="true" />
                  <span className="hidden sm:inline">Download Proof</span>
                </button>
              )}
              {userWallet === invoice.sellerPublicKey && (
                <button
                  onClick={() => setDuplicateOpen(true)}
                  className="btn btn-outline flex items-center gap-2"
                  aria-label="Duplicate invoice"
                >
                  <Copy className="w-5 h-5" aria-hidden="true" />
                  <span className="hidden sm:inline">Duplicate</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {duplicateOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="duplicate-title">
            <div className="card w-full max-w-md">
              <h2 id="duplicate-title" className="text-xl font-bold text-gray-900 mb-3">Duplicate invoice</h2>
              <p className="text-sm text-gray-600 mb-5">A new pending invoice will be created with a new ID and payment memo.</p>
              <label className="flex items-center gap-3 text-sm text-gray-700 mb-6">
                <input
                  type="checkbox"
                  checked={copyCustomerEmail}
                  onChange={(event) => setCopyCustomerEmail(event.target.checked)}
                />
                Copy client email
              </label>
              <div className="flex justify-end gap-3">
                <button type="button" className="btn btn-outline" onClick={() => setDuplicateOpen(false)} disabled={duplicating}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleDuplicate} disabled={duplicating}>
                  {duplicating ? 'Duplicating…' : 'Duplicate invoice'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="card">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Invoice Details</h2>

              <div className="space-y-5">
                <div className="border-b pb-4">
                  <p className="text-sm text-gray-600 mb-1">Seller</p>
                  {invoice.sellerName && <p className="text-gray-900">{invoice.sellerName}</p>}
                  <p className="font-mono text-sm text-gray-900" title={invoice.sellerPublicKey}>
                    {invoice.sellerPublicKey.slice(0, 8)}…{invoice.sellerPublicKey.slice(-8)}
                  </p>
                </div>
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

                {invoice.lineItems?.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-5">
                    <p className="text-xs text-gray-600 mb-3 font-semibold uppercase tracking-wide">Line Items</p>
                    <div className="space-y-3">
                      {invoice.lineItems.map((line: any, index: number) => (
                        <div key={`${line.label}-${index}`} className="grid grid-cols-[1fr_auto] gap-3 border-b last:border-b-0 pb-3 last:pb-0">
                          <div>
                            <p className="font-medium text-gray-900">{line.label}</p>
                            <p className="text-xs text-gray-500">
                              {line.quantity} × {formatAmount(line.unitPrice, 7)} {invoice.assetCode}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {formatAmount(Number(line.quantity) * Number(line.unitPrice), 7)} {invoice.assetCode}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="border-t mt-3 pt-3 flex justify-between font-bold">
                      <span>Total</span>
                      <span>{formatAmount(invoice.amount, 7)} {invoice.assetCode}</span>
                    </div>
                  </div>
                )}

                {invoice.status === 'PAID' && (
                  <button
                    type="button"
                    onClick={handleDownloadProof}
                    className="btn btn-primary w-full flex items-center justify-center gap-2"
                    aria-label="Download Proof"
                  >
                    <Download className="w-5 h-5" aria-hidden="true" />
                    Download Proof
                  </button>
                )}

                {invoice.status === 'PAID' && isSeller && !invoice.anchoringTxHash && (
                  <button
                    type="button"
                    onClick={handleAnchorProof}
                    disabled={anchoring}
                    className="btn btn-outline w-full flex items-center justify-center gap-2"
                    aria-label="Anchor Proof"
                  >
                    {anchoring ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                        Anchoring...
                      </>
                    ) : (
                      'Anchor Proof On Chain'
                    )}
                  </button>
                )}

                {invoice.anchoringTxHash && (
                  <div className="border-b pb-4">
                    <p className="text-sm text-gray-600 mb-1">Proof anchored on chain</p>
                    <p className="font-mono text-sm text-gray-900 break-all">{invoice.anchoringTxHash}</p>
                  </div>
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
                  <p className="text-sm text-gray-600 mb-1">Created (UTC)</p>
                  <p className="text-gray-900" data-testid="invoice-created-utc">{formatUtc(invoice.createdAt)}</p>
                </div>

                {invoice.paidAt && (
                  <div className="border-b pb-4">
                    <p className="text-sm text-gray-600 mb-1">Paid (UTC)</p>
                    <p className="text-gray-900" data-testid="invoice-paid-utc">{formatUtc(invoice.paidAt)}</p>
                  </div>
                )}

                {invoice.ledger && (
                  <div className="border-b pb-4">
                    <p className="text-sm text-gray-600 mb-1">Ledger</p>
                    <p className="font-mono text-sm text-gray-900">{invoice.ledger}</p>
                  </div>
                )}

                {invoice.payerPublicKey && (
                  <div className="border-b pb-4">
                    <p className="text-sm text-gray-600 mb-1">Payer</p>
                    <p className="font-mono text-sm text-gray-900">{invoice.payerPublicKey}</p>
                  </div>
                )}

                {invoice.refundTxHash && (
                  <div className="border-b pb-4">
                    <p className="text-sm text-gray-600 mb-1">Refund Transaction</p>
                    <p className="font-mono text-sm text-gray-900 break-all">{invoice.refundTxHash}</p>
                    {invoice.refundedAt && <p className="mt-1 text-sm text-gray-600">Refunded {formatDate(invoice.refundedAt)}</p>}
                  </div>
                )}

                {invoice.status === 'PENDING' && (
                  <div className="border-b pb-4">
                    <p className="text-sm text-gray-600 mb-1">Expires In</p>
                    <p className="text-gray-900 font-semibold">
                      {timeRemaining}
                    </p>
                  </div>
                )}

                {invoice.expiryExtended ? (
                  <>
                    <div className="border-b pb-4">
                      <p className="text-sm text-gray-600 mb-1">Original Expiry</p>
                      <p className="text-gray-900">{formatDate(invoice.originalExpiresAt)}</p>
                    </div>
                    <div className="border-b pb-4">
                      <p className="text-sm text-gray-600 mb-1">Extended Expiry</p>
                      <p className="text-gray-900 font-semibold">{formatDate(invoice.expiresAt)}</p>
                    </div>
                  </>
                ) : (
                  <div className="border-b pb-4">
                    <p className="text-sm text-gray-600 mb-1">Expires At</p>
                    <p className="text-gray-900">{formatDate(invoice.expiresAt)}</p>
                  </div>
                )}

              </div>
            </div>

            <div className="space-y-6">
              {invoice.status !== 'PAID' && (
                <PaymentStatus status={invoice.status} txHash={invoice.status === 'REFUNDED' ? invoice.refundTxHash : invoice.paymentTxHash} />
              )}

              {invoice.status === 'PAID' && (
                <PaymentReceipt invoice={invoice} />
              )}

              {invoice.status === 'PAID' && userWallet === invoice.sellerPublicKey && (
                <div className="card">
                  <h3 className="text-lg font-semibold mb-2">Record a refund</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Submit the Stellar transaction hash after returning the full amount to {invoice.payerPublicKey} with memo {invoice.memo}.
                  </p>
                  <label htmlFor="refund-hash" className="block text-sm font-medium text-gray-700 mb-1">Refund transaction hash</label>
                  <input
                    id="refund-hash"
                    value={refundTxHash}
                    onChange={(event) => setRefundTxHash(event.target.value)}
                    className="input w-full font-mono"
                    placeholder="64-character transaction hash"
                  />
                  <button type="button" onClick={() => void handleRefund()} disabled={refunding || !refundTxHash.trim()} className="btn btn-primary w-full mt-3">
                    {refunding ? 'Verifying refund…' : 'Verify refund'}
                  </button>
                </div>
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
                        invoice.sellerMuxedAddress ?? invoice.sellerPublicKey,
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
