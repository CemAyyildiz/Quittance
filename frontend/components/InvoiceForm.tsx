'use client';

import { useEffect, useState } from 'react';
import { invoiceApi } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { STELLAR_ASSETS, getAssetByCode } from '@/lib/assets';
import { checkAssetReadiness } from '@/lib/stellar';
import { MAX_MEMO_BYTES, getUtf8ByteLength, isValidEmail } from '@/lib/utils';
import AssetLogo from './AssetLogo';

interface InvoiceFormProps {
  onSuccess?: (invoice: any) => void;
  userWallet?: string;
}

const amountErrorId = 'amount-error';
const memoCounterId = 'memo-counter';
const memoErrorId = 'memo-error';
const MAX_LINE_ITEMS = 20;

type InvoiceLineInput = {
  label: string;
  quantity: string;
  unitPrice: string;
};

function roundStellarAmount(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000_000) / 10_000_000;
}

export default function InvoiceForm({ onSuccess, userWallet }: InvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [lineItems, setLineItems] = useState<InvoiceLineInput[]>([
    { label: '', quantity: '1', unitPrice: '' },
  ]);
  const [assetCode, setAssetCode] = useState('XLM');
  const [description, setDescription] = useState('');
  const [memo, setMemo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [trustlineWarning, setTrustlineWarning] = useState<string | null>(null);
  const [amountError, setAmountError] = useState('');
  const [emailError, setEmailError] = useState('');

  const selectedAsset = getAssetByCode(assetCode);
  const memoBytes = getUtf8ByteLength(memo);
  const memoTooLong = memoBytes > MAX_MEMO_BYTES;
  const lineItemValues = lineItems.map((line) => {
    const quantity = Number(line.quantity);
    const unitPrice = Number(line.unitPrice);
    return {
      label: line.label.trim(),
      quantity,
      unitPrice,
      lineAmount:
        quantity > 0 && unitPrice > 0
          ? roundStellarAmount(quantity * unitPrice)
          : 0,
    };
  });
  const calculatedAmount = roundStellarAmount(
    lineItemValues.reduce((sum, line) => sum + line.lineAmount, 0),
  );
  const invalidLines = lineItemValues.some(
    (line) =>
      !Number.isFinite(line.quantity) ||
      line.quantity <= 0 ||
      !Number.isFinite(line.unitPrice) ||
      line.unitPrice <= 0 ||
      String(line.quantity).split('.')[1]?.length > 7 ||
      String(line.unitPrice).split('.')[1]?.length > 7,
  );

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

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setLineItems((current) =>
      current.map((line, index) =>
        index === 0 ? { ...line, unitPrice: value } : line,
      ),
    );
    if (value && (isNaN(parseFloat(value)) || parseFloat(value) <= 0)) {
      setAmountError('Amount must be greater than 0');
    } else {
      setAmountError('');
    }
  };

  const updateLineItem = (
    index: number,
    field: keyof InvoiceLineInput,
    value: string,
  ) => {
    setLineItems((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line,
      ),
    );
    if (index === 0 && field === 'unitPrice') {
      setAmount(value);
    }
  };

  const addLineItem = () => {
    if (lineItems.length >= MAX_LINE_ITEMS) return;
    setLineItems((current) => [
      ...current,
      { label: '', quantity: '1', unitPrice: '' },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((current) => {
      const next = current.filter((_, lineIndex) => lineIndex !== index);
      if (next.length === 0) return [{ label: '', quantity: '1', unitPrice: '' }];
      if (index === 0) setAmount(next[0].unitPrice);
      return next;
    });
  };

  const handleEmailChange = (value: string) => {
    setCustomerEmail(value);
    if (value && !isValidEmail(value)) {
      setEmailError('Enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userWallet) {
      toast.error('Connect your wallet first');
      return;
    }

    const amountNum = calculatedAmount;
    if (!amount || amountNum <= 0 || isNaN(amountNum) || invalidLines) {
      setAmountError('Enter a valid amount');
      return;
    }
    setAmountError('');

    if (customerEmail && !isValidEmail(customerEmail)) {
      setEmailError('Enter a valid client email');
      return;
    }
    setEmailError('');

    if (memoTooLong) {
      toast.error(`Memo must be at most ${MAX_MEMO_BYTES} bytes`);
      return;
    }

    setLoading(true);
    try {
      const selectedAsset = getAssetByCode(assetCode);
      const submittedLineItems = lineItems.map((line) => ({
        label: line.label.trim() || description.trim() || 'Item',
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
      }));
      const result = await invoiceApi.create({
        amount: amountNum,
        lineItems: submittedLineItems,
        assetCode: assetCode,
        assetIssuer: selectedAsset?.issuer,
        expiresInDays: 7,
        sellerPublicKey: userWallet,
        description: description || undefined,
        memo: memo || undefined,
        customerName: customerName.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
      });

      toast.success('Invoice created');
      onSuccess?.(result.data);
      setAmount('');
      setLineItems([{ label: '', quantity: '1', unitPrice: '' }]);
      setAssetCode('XLM');
      setDescription('');
      setMemo('');
      setCustomerName('');
      setCustomerEmail('');
      setAmountError('');
      setEmailError('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Line Items *</label>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_140px] gap-3">
          <input
            aria-label="Line 1 label"
            type="text"
            className="input text-sm"
            placeholder="Line 1 label"
            value={lineItems[0]?.label || ''}
            onChange={(e) => updateLineItem(0, 'label', e.target.value)}
            maxLength={255}
          />
          <input
            aria-label="Line 1 quantity"
            type="number"
            step="0.0000001"
            min="0.0000001"
            className="input text-sm"
            placeholder="Qty"
            value={lineItems[0]?.quantity || '1'}
            onChange={(e) => updateLineItem(0, 'quantity', e.target.value)}
            aria-invalid="false"
          />
          <input
            aria-label="Line 1 unit price"
            type="number"
            step="0.0000001"
            min="0.0000001"
            required
            className={`input text-sm font-semibold ${amountError ? 'border-red-500' : ''}`}
            placeholder="10.00"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            aria-invalid={Boolean(amountError)}
            aria-describedby={amountError ? amountErrorId : undefined}
          />
        </div>
        {lineItems.slice(1).map((line, offset) => {
          const index = offset + 1;
          return (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_100px_140px_auto] gap-3 mt-3">
              <input
                aria-label={`Line ${index + 1} label`}
                type="text"
                className="input text-sm"
                placeholder={`Line ${index + 1} label`}
                value={line.label}
                onChange={(e) => updateLineItem(index, 'label', e.target.value)}
                maxLength={255}
              />
              <input
                aria-label={`Line ${index + 1} quantity`}
                type="number"
                step="0.0000001"
                min="0.0000001"
                className="input text-sm"
                placeholder="Qty"
                value={line.quantity}
                onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
              />
              <input
                aria-label={`Line ${index + 1} unit price`}
                type="number"
                step="0.0000001"
                min="0.0000001"
                className="input text-sm"
                placeholder="Unit price"
                value={line.unitPrice}
                onChange={(e) => updateLineItem(index, 'unitPrice', e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeLineItem(index)}
                className="btn btn-outline px-3"
                aria-label={`Remove line ${index + 1}`}
              >
                Remove
              </button>
            </div>
          );
        })}
        <div className="flex items-center justify-between mt-3">
          <button
            type="button"
            onClick={addLineItem}
            disabled={lineItems.length >= MAX_LINE_ITEMS}
            className="btn btn-outline"
          >
            Add line
          </button>
          <div className="text-right">
            <p className="text-xs text-gray-500">Invoice total</p>
            <p className="text-xl font-bold text-gray-900">
              {calculatedAmount.toFixed(7).replace(/0+$/, '').replace(/\.$/, '')} {assetCode}
            </p>
          </div>
        </div>
        {invalidLines && (
          <p className="text-sm text-red-600 mt-2">
            Quantity and unit price must be greater than zero.
          </p>
        )}
        <div className="mt-3">
          <div className="relative w-full sm:w-40">
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
        {amountError && (
          <p id={amountErrorId} className="text-sm text-red-600 mt-1">
            {amountError}
          </p>
        )}
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
        <label className="label" htmlFor="invoice-memo">
          Memo (optional)
        </label>
        <input
          id="invoice-memo"
          type="text"
          className={`input text-sm ${memoTooLong ? 'border-red-500' : ''}`}
          placeholder="Payment reference, e.g. INV-2026"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          aria-invalid={memoTooLong}
          aria-describedby={memoTooLong ? `${memoCounterId} ${memoErrorId}` : memoCounterId}
        />
        <p
          id={memoCounterId}
          aria-live="polite"
          className={`text-xs mt-1 ${memoTooLong ? 'text-red-600 font-semibold' : 'text-gray-500'}`}
        >
          {memoBytes}/{MAX_MEMO_BYTES} bytes
        </p>
        {memoTooLong && (
          <p id={memoErrorId} className="text-sm text-red-600 mt-1">
            Memo is {memoBytes} bytes. Stellar allows at most {MAX_MEMO_BYTES} bytes, and
            non-ASCII characters use more than one byte each.
          </p>
        )}
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
          className={`input text-sm ${emailError ? 'border-red-500' : ''}`}
          placeholder="client@example.com — for sending the invoice"
          value={customerEmail}
          onChange={(e) => handleEmailChange(e.target.value)}
          maxLength={255}
          aria-invalid={Boolean(emailError)}
          aria-describedby={emailError ? 'email-error' : undefined}
        />
        {emailError ? (
          <p id="email-error" className="text-sm text-red-600 mt-1">
            {emailError}
          </p>
        ) : (
          <p className="text-xs text-gray-500 mt-1">
            Used only to send the invoice or payment proof. Not required to create an invoice.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || memoTooLong}
        aria-busy={loading}
        className="btn btn-primary w-full flex items-center justify-center gap-2 mt-6"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            Creating...
          </>
        ) : (
          'Create Invoice'
        )}
      </button>
    </form>
  );
}
