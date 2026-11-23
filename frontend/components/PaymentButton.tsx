'use client';

import { useState, useEffect } from 'react';
import { sendPayment, checkWalletConnection, requestWalletAccess, getWalletNetwork } from '@/lib/stellar';
import { toast } from 'sonner';
import { Wallet, Loader2 } from 'lucide-react';
import { invoiceApi } from '@/lib/api';
import { getAssetByCode } from '@/lib/assets';
import { horizonStatus } from '@/lib/horizonStatus';

interface PaymentButtonProps {
  destination: string;
  amount: string;
  memo: string;
  assetCode?: string;
  assetIssuer?: string;
  invoiceId?: string;
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
  payerName,
  payerEmail,
  onSuccess,
  onError,
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const recheckWalletNetwork = async () => {
    const liveWalletNetwork = await getWalletNetwork();
    const configured = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'TESTNET')
      .trim()
      .toUpperCase();
    const expected = configured === 'TESTNET' ? 'TESTNET' : 'PUBLIC';
    const mismatch = liveWalletNetwork !== expected;
    return { mismatch, liveWalletNetwork, expected };
  };

  useEffect(() => {
    recheckWalletNetwork();
    const interval = window.setInterval(recheckWalletNetwork, 3000);
    window.addEventListener('focus', recheckWalletNetwork);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', recheckWalletNetwork);
    };
  }, []);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Block payment if networks mismatch
      const networkCheck = await recheckWalletNetwork();
      if (networkCheck.mismatch) {
        toast.error(
          `Network mismatch: Freighter is on ${networkCheck.liveWalletNetwork === 'PUBLIC' ? 'Mainnet' : networkCheck.liveWalletNetwork === 'TESTNET' ? 'Testnet' : 'unknown'}, but this app is configured for ${networkCheck.expected === 'PUBLIC' ? 'Mainnet' : 'Testnet'}.`
        );
        setLoading(false);
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

      toast.loading('Confirm in wallet...', { id: PAY_TOAST_ID });
      const txHash = await sendPayment(destination, amount, memo, assetCode, assetIssuer);

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

  return (
    <div>
      {assetCode !== 'XLM' && assetIssuer && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-800 font-semibold mb-1">
            Paying with {assetCode} (testnet)
          </p>
          <p className="text-xs text-amber-700 break-all">
            Your Freighter wallet needs a {assetCode} trustline to issuer {assetIssuer} and at
            least {amount} {assetCode}. Without it the payment cannot go through.
          </p>
        </div>
      )}
      <button
        onClick={handlePayment}
        disabled={loading}
        aria-busy={loading}
        className="btn btn-primary w-full flex items-center justify-center gap-2 text-lg py-4"
      >
        {loading ? (
          <>
            <Loader2 aria-hidden="true" className="w-6 h-6 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Wallet aria-hidden="true" className="w-6 h-6" />
            Pay with Freighter
          </>
        )}
      </button>
    </div>
  );
}