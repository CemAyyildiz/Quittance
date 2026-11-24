'use client';

import { useState } from 'react';
import {
  sendPayment,
  checkWalletConnection,
  requestWalletAccess,
  getUserPublicKey,
  getAccountBalance,
  hasEnoughXlmForFee,
  isTestnetNetwork,
  requestFriendbotFunding,
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
  onSuccess,
  onError,
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [offerFunding, setOfferFunding] = useState(false);
  const [funding, setFunding] = useState(false);
  const [fundingError, setFundingError] = useState<string | null>(null);

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

    setLoading(true);
    setOfferFunding(false);
    setFundingError(null);
    try {
      const connected = await checkWalletConnection();
      if (!connected) {
        const allowed = await requestWalletAccess();
        if (!allowed) {
          toast.error('Access denied');
          return;
        }
      }

      if (checkFeeBalance && (await needsTestnetFunding())) {
        setOfferFunding(true);
        return;
      }

      toast.loading('Confirm in wallet...', { id: PAY_TOAST_ID });
      const txHash = await sendPayment(
        destination,
        amount,
        memo,
        assetCode,
        issuer,
        bounds?.ok ? bounds.maxTime : undefined,
      );

      if (invoiceId) {
        toast.loading('Verifying payment...', { id: PAY_TOAST_ID });
        try {
          await invoiceApi.verify(invoiceId, txHash, {
            payerName,
            payerEmail,
          });
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
      <button
        onClick={handlePayment}
        disabled={loading || (timeBounds !== undefined && !timeBounds.ok)}
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
