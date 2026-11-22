'use client';

import { useState } from 'react';
import {
  sendPayment,
  checkWalletConnection,
  requestWalletAccess,
  isValidPublicKey,
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
  const [feeBumpEnabled, setFeeBumpEnabled] = useState(false);
  const [feeSource, setFeeSource] = useState('');

  const issuer = assetIssuer || getAssetByCode(assetCode)?.issuer;

  const handlePayment = async () => {
    const trimmedFeeSource = feeSource.trim();

    if (feeBumpEnabled && !isValidPublicKey(trimmedFeeSource)) {
      toast.error('Enter a valid fee source account');
      return;
    }

    setLoading(true);
    try {
      const connected = await checkWalletConnection();
      if (!connected) {
        const allowed = await requestWalletAccess();
        if (!allowed) {
          toast.error('Access denied');
          return;
        }
      }

      toast.loading('Confirm in wallet...', { id: PAY_TOAST_ID });
      const txHash = await sendPayment(
        destination,
        amount,
        memo,
        assetCode,
        issuer,
        feeBumpEnabled ? { feeSource: trimmedFeeSource } : undefined
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
