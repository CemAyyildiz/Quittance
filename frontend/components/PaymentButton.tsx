'use client';

import { useEffect, useState } from 'react';
import {
  sendPayment,
  checkWalletConnection,
  requestWalletAccess,
  getWalletNetwork,
  getConfiguredNetwork,
  getNetworkMismatch,
  type WalletNetwork,
} from '@/lib/stellar';
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

  const handlePayment = async () => {
    setLoading(true);
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

      toast.loading('Confirm in wallet...', { id: PAY_TOAST_ID });
      const txHash = await sendPayment(destination, amount, memo, assetCode, issuer);

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
      <button
        onClick={handlePayment}
        disabled={loading || networkMismatch}
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
