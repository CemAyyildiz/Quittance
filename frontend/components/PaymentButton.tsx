'use client';

import { useEffect, useState } from 'react';
import {
  sendPayment,
  checkWalletConnection,
  requestWalletAccess,
  getWalletNetwork,
  getConfiguredNetwork,
  getNetworkMismatch,
  getUserPublicKey,
  getAccountBalance,
  requestFriendbotFunding,
  isTestnetNetwork,
  isValidPublicKey,
  hasEnoughXlmForFee,
  type WalletNetwork,
} from '@/lib/stellar';
import { toast } from 'sonner';
import { Wallet, Loader2 } from 'lucide-react';
import { invoiceApi } from '@/lib/api';
import { getAssetByCode } from '@/lib/assets';
import { horizonStatus } from '@/lib/horizonStatus';
import { getInvoiceTimeBounds } from '@/lib/invoiceTimeBounds';

interface PaymentButtonProps {
  destination: string;
  amount: string;
  memo: string;
  assetCode?: string;
  assetIssuer?: string;
  invoiceId?: string;
  /** Invoice expiry; the payment transaction is bound to it. */
  expiresAt?: string | Date;
  payerName?: string;
  payerEmail?: string;
  /**
   * Parent-owned busy state (for example an in-flight manual verification).
   * While true the pay control is not clickable.
   */
  disabled?: boolean;
  onSuccess?: (txHash: string) => void;
  onError?: (error: unknown) => void;
}

const PAY_TOAST_ID = 'payment-flow';

export default function PaymentButton({
  destination,
  amount,
  memo,
  assetCode = 'XLM',
  assetIssuer,
  invoiceId,
  expiresAt,
  payerName,
  payerEmail,
  disabled = false,
  onSuccess,
  onError,
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  // A verified payment has settled the invoice; paying again would duplicate it.
  const [settled, setSettled] = useState(false);
  const [feeBumpEnabled, setFeeBumpEnabled] = useState(false);
  const [feeSource, setFeeSource] = useState('');
  const [offerFunding, setOfferFunding] = useState(false);
  const [funding, setFunding] = useState(false);
  const [fundingError, setFundingError] = useState<string | null>(null);
  const [walletNetwork, setWalletNetwork] = useState<WalletNetwork>('UNKNOWN');
  const [networkMismatch, setNetworkMismatch] = useState(false);
  const configuredNetwork = getConfiguredNetwork();

  useEffect(() => {
    let cancelled = false;
    const recheckNetwork = async () => {
      const wallet = await getWalletNetwork();
      if (!cancelled) {
        setWalletNetwork(wallet);
        setNetworkMismatch(getNetworkMismatch(wallet, configuredNetwork));
      }
    };
    void recheckNetwork();
    const interval = window.setInterval(recheckNetwork, 500);
    window.addEventListener('focus', recheckNetwork);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', recheckNetwork);
    };
  }, [configuredNetwork]);

  const issuer = assetIssuer || getAssetByCode(assetCode)?.issuer;
  const timeBounds = expiresAt ? getInvoiceTimeBounds(expiresAt) : undefined;

  /**
   * A fresh testnet account with no XLM cannot pay the network fee; that is a
   * funding problem, not an invoice bug. Only native XLM is checked here, so a
   * USDC trustline/balance problem keeps its existing guidance.
   */
  const needsTestnetFunding = async (): Promise<boolean> => {
    if (!isTestnetNetwork()) {
      return false;
    }

    try {
      const publicKey = await getUserPublicKey();
      if (!publicKey) {
        return false;
      }

      const balances = await getAccountBalance(publicKey);
      const xlmBalance = balances.find((balance) => balance.assetCode === 'XLM')?.balance;
      return !hasEnoughXlmForFee(xlmBalance);
    } catch (error) {
      // A balance lookup must never block the payment attempt itself.
      console.error('Could not check XLM balance:', error);
      return false;
    }
  };

  const pay = async (checkFeeBalance: boolean) => {
    const bounds = expiresAt ? getInvoiceTimeBounds(expiresAt) : undefined;
    if (bounds && !bounds.ok) {
      toast.error(bounds.message, { id: PAY_TOAST_ID });
      return;
    }

    const feeSourceAccount = feeSource.trim();
    if (feeBumpEnabled && !isValidPublicKey(feeSourceAccount)) {
      toast.error('Enter a valid fee source account');
      return;
    }

    setLoading(true);
    setOfferFunding(false);
    setFundingError(null);
    try {
      const liveWalletNetwork = await getWalletNetwork();
      const mismatch = getNetworkMismatch(liveWalletNetwork, configuredNetwork);
      setWalletNetwork(liveWalletNetwork);
      setNetworkMismatch(mismatch);
      if (mismatch) {
        toast.error(
          `Network mismatch: Freighter is on ${liveWalletNetwork}, but the API is configured for ${configuredNetwork}.`,
        );
        return;
      }
      const connected = await checkWalletConnection();
      if (!connected) {
        const allowed = await requestWalletAccess();
        if (!allowed) {
          toast.error('Access denied');
          return;
        }
      }

      if (checkFeeBalance && !feeBumpEnabled && (await needsTestnetFunding())) {
        setOfferFunding(true);
        return;
      }

      toast.loading('Confirm in wallet...', { id: PAY_TOAST_ID });
      const maxTime = bounds?.ok ? bounds.maxTime : undefined;
      const txHash =
        maxTime !== undefined && feeBumpEnabled
          ? await sendPayment(
              destination,
              amount,
              memo,
              assetCode,
              issuer,
              maxTime,
              { feeSource: feeSourceAccount },
            )
          : await sendPayment(
              destination,
              amount,
              memo,
              assetCode,
              issuer,
              feeBumpEnabled ? { feeSource: feeSourceAccount } : maxTime,
            );

      if (invoiceId) {
        toast.loading('Verifying payment...', { id: PAY_TOAST_ID });
        // Hold the pay control from the moment verification starts until it
        // finishes, so a slow response cannot allow a second submission.
        setVerifying(true);
        try {
          await invoiceApi.verify(invoiceId, txHash, {
            payerName,
            payerEmail,
          });
          // Verified: the invoice is settled, so the control stays disabled.
          setSettled(true);
          toast.success('Payment verified', {
            id: PAY_TOAST_ID,
            description: `TX: ${txHash.slice(0, 8)}...${txHash.slice(-8)}`,
          });
        } catch (error) {
          console.error('Verification failed:', error);
          toast.warning('Payment sent but verification failed', {
            id: PAY_TOAST_ID,
            description: 'Refresh the page or wait for status to update',
          });
        } finally {
          // A failed verification (caught above) re-enables the control.
          setVerifying(false);
        }
      } else {
        toast.success('Payment successful', {
          id: PAY_TOAST_ID,
          description: `TX: ${txHash.slice(0, 8)}...${txHash.slice(-8)}`,
        });
      }

      onSuccess?.(txHash);
    } catch (error: any) {
      if (onError) {
        onError(error);
      } else {
        toast.error('Payment failed', {
          id: PAY_TOAST_ID,
          description: horizonStatus(error) || error.message || 'Try again',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    void pay(true);
  };

  const handleFriendbotFunding = async () => {
    setFunding(true);
    setFundingError(null);
    try {
      const publicKey = await getUserPublicKey();
      if (!publicKey) {
        throw new Error('Could not get user public key');
      }

      await requestFriendbotFunding(publicKey);
      setOfferFunding(false);
      // Skip the balance check on the retry: Horizon may lag behind Friendbot.
      await pay(false);
    } catch (error) {
      console.error('Friendbot funding error:', error);
      setFundingError('Friendbot could not fund this account. Try again in a moment.');
    } finally {
      setFunding(false);
    }
  };

  return (
    <div>
      {networkMismatch && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 mb-4 text-sm text-red-800">
          Network mismatch: Freighter is on {walletNetwork}, but the API is configured for {configuredNetwork}.
        </div>
      )}
      {assetCode !== 'XLM' && issuer && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-800 font-semibold mb-1">
            Paying with {assetCode} (testnet)
          </p>
          <p className="text-xs text-amber-700 break-all">
            Your Freighter wallet needs a {assetCode} trustline to issuer {issuer} and at
            least {amount} {assetCode}. Without it the payment cannot go through.
          </p>
        </div>
      )}
      {timeBounds && !timeBounds.ok && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          {timeBounds.message}
        </p>
      )}
      {isTestnetNetwork() && offerFunding && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4" role="status">
          <p className="text-sm text-amber-800 mb-3">
            This account has no XLM to pay the network fee. Request test XLM from
            Friendbot, then the payment will retry.
          </p>
          <button
            type="button"
            onClick={handleFriendbotFunding}
            disabled={funding}
            aria-busy={funding}
            className="btn btn-outline w-full flex items-center justify-center gap-2"
          >
            {funding ? (
              <>
                <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
                Requesting test XLM...
              </>
            ) : (
              'Get test XLM from Friendbot'
            )}
          </button>
          {fundingError && (
            <p role="alert" className="text-sm text-red-700 mt-3">
              {fundingError}
            </p>
          )}
        </div>
      )}
      <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <label className="flex items-start gap-3 text-sm font-medium text-gray-900">
          <input
            type="checkbox"
            checked={feeBumpEnabled}
            onChange={(event) => setFeeBumpEnabled(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300"
          />
          <span>
            Another account pays the network fee
            <span className="mt-1 block text-xs font-normal text-gray-600">
              Fee-bump this payment. The fee source account must also be unlocked in
              Freighter.
            </span>
          </span>
        </label>

        {feeBumpEnabled && (
          <div className="mt-3">
            <label
              htmlFor="fee-source-account"
              className="mb-1 block text-xs font-medium text-gray-700"
            >
              Fee source account
            </label>
            <input
              id="fee-source-account"
              type="text"
              value={feeSource}
              onChange={(event) => setFeeSource(event.target.value)}
              placeholder="G..."
              className="input font-mono text-xs"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handlePayment}
        disabled={
          loading ||
          verifying ||
          settled ||
          disabled ||
          (timeBounds !== undefined && !timeBounds.ok)
        }
        aria-busy={loading}
        className="btn btn-primary w-full flex items-center justify-center gap-2 text-lg py-4"
      >
        {loading ? (
          <>
            <Loader2 aria-hidden="true" className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Wallet aria-hidden="true" className="w-5 h-5" />
            Pay with Freighter
          </>
        )}
      </button>
    </div>
  );
}
