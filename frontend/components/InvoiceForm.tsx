'use client';

import { useEffect, useState } from 'react';
import { invoiceApi } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { STELLAR_ASSETS, getAssetByCode } from '@/lib/assets';
import { checkAssetReadiness } from '@/lib/stellar';
import AssetLogo from './AssetLogo';

interface InvoiceFormProps {
  onSuccess?: (invoice: any) => void;
  userWallet?: string;
}

export default function InvoiceForm({ onSuccess, userWallet }: InvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [assetCode, setAssetCode] = useState('XLM');
  const [description, setDescription] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [trustlineWarning, setTrustlineWarning] = useState<string | null>(null);

  const selectedAsset = getAssetByCode(assetCode);

  useEffect(() => {
    setTrustlineWarning(null);
    const asset = getAssetByCode(assetCode);
    if (!userWallet || !asset?.issuer) return;
    let cancelled = false;
    checkAssetReadiness(userWallet, asset.code, asset.issuer)
      .then((readiness) => {
        if (!cancelled && readiness === 'no-trustline') {
          setTrustlineWarning(
            `Your wallet has no ${asset.code} trustline yet, so it cannot receive ${asset.code}. Add the asset in Freighter before sharing this invoice.`
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userWallet, assetCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userWallet) {
      toast.error('Connect your wallet first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      toast.error('Enter a valid client email');
      return;
    }

    setLoading(true);
    try {
      const selectedAsset = getAssetByCode(assetCode);
      const result = await invoiceApi.create({
        amount: parseFloat(amount),
        assetCode: assetCode,
        assetIssuer: selectedAsset?.issuer,
        expiresInDays: 7,
        sellerPublicKey: userWallet,
        description: description || undefined,
        customerName: customerName.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
      });

      toast.success('Invoice created');
      onSuccess?.(result.data);
      setAmount('');
      setAssetCode('XLM');
      setDescription('');
      setCustomerName('');
      setCustomerEmail('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Invoice Amount *</label>
        <div className="flex gap-3 flex-col sm:flex-row">
          <input
            type="number"
            step="0.0000001"
            min="0.0000001"
            required
            className="input flex-1 text-2xl font-semibold"
            placeholder="10.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="relative">
            <select
              value={assetCode}
              onChange={(e) => setAssetCode(e.target.value)}
              className="input w-full sm:w-40 text-sm font-semibold pl-12 pr-3 appearance-none cursor-pointer"
            >
              {STELLAR_ASSETS.map((asset) => (
                <option key={asset.code} value={asset.code}>
                  {asset.code}
                </option>
              ))}
            </select>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <AssetLogo code={assetCode} size={24} showName={false} />
            </div>
          </div>
        </div>
        {selectedAsset?.issuer && (
          <div className="text-xs text-gray-500 mt-2 break-all">
            <p>
              {selectedAsset.code} payments require a {selectedAsset.code} trustline in the
              payer's Freighter wallet (testnet issuer {selectedAsset.issuer}). XLM needs no
              setup.
            </p>
            {trustlineWarning && (
              <p className="text-amber-600 font-semibold mt-1">{trustlineWarning}</p>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-none text-sm"
          placeholder="What is this invoice for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
        />
      </div>

      <div>
        <label className="label">Client name (optional)</label>
        <input
          type="text"
          className="input text-sm"
          placeholder="Client or company name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          maxLength={255}
        />
      </div>

      <div>
        <label className="label">Client email (optional)</label>
        <input
          type="email"
          className="input text-sm"
          placeholder="client@example.com — for sending the invoice"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          maxLength={255}
        />
        <p className="text-xs text-gray-500 mt-1">
          Used only to send the invoice or payment proof. Not required to create an invoice.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary w-full flex items-center justify-center gap-2 mt-6"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating...
          </>
        ) : (
          'Create Invoice'
        )}
      </button>
    </form>
  );
}
