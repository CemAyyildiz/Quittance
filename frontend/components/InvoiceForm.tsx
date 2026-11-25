'use client';

import { useEffect, useRef, useState } from 'react';
import { invoiceApi } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { STELLAR_ASSETS, getAssetByCode } from '@/lib/assets';
import {
  checkAssetReadiness,
  getConfiguredNetwork,
  getNetworkMismatch,
  getWalletNetwork,
  type WalletNetwork,
} from '@/lib/stellar';
import { MAX_MEMO_BYTES, getUtf8ByteLength, isValidEmail } from '@/lib/utils';
import { extractBaseAddress, StrKey } from '@stellar/stellar-sdk';
import AssetLogo from './AssetLogo';
import { parseAmount } from '@/lib/amountParse';

interface InvoiceFormProps {
  onSuccess?: (invoice: any) => void;
  userWallet?: string;
}

const amountErrorId = 'amount-error';
const draftStoragePrefix = 'quittance:invoice-draft:';
const rememberedAssetStorageKey = 'quittance:last-invoiced-asset';

/** Whether a raw amount string carries more than seven decimal places. */
function hasTooManyDecimals(value: string): boolean {
  const normalized = value.trim().replace(',', '.');
  const fraction = normalized.split('.')[1] ?? '';
  return fraction.length > 7;
}

/** Whether the value resolves to an absolute instant after now. */
function isFutureExpiry(value: string): boolean {
  const ms = Date.parse(value);
  return Number.isFinite(ms) && ms > Date.now();
}

interface InvoiceDraft {
  amount: string;
  description: string;
  customerName: string;
}

interface RememberedInvoiceAsset {
  assetCode: string;
  assetIssuer: string | null;
}

function discardRememberedAsset(): boolean {
  try {
    window.localStorage.removeItem(rememberedAssetStorageKey);
    return true;
  } catch (error) {
    console.warn('Could not clear remembered invoice asset:', error);
    return false;
  }
}

function readRememberedAsset(): string | null {
  if (typeof window === 'undefined') return null;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(rememberedAssetStorageKey);
  } catch (error) {
    console.warn('Could not read remembered invoice asset:', error);
    return null;
  }
  if (!raw) return null;

  try {
    const stored = JSON.parse(raw) as Partial<RememberedInvoiceAsset> | null;
    const asset =
      stored && typeof stored.assetCode === 'string'
        ? getAssetByCode(stored.assetCode)
        : undefined;
    const issuerIsValid = asset?.issuer
      ? typeof stored?.assetIssuer === 'string' &&
        StrKey.isValidEd25519PublicKey(stored.assetIssuer) &&
        stored.assetIssuer === asset.issuer
      : stored?.assetIssuer == null;

    if (!asset || !issuerIsValid) {
      discardRememberedAsset();
      return null;
    }

    return asset.code;
  } catch (error) {
    console.warn('Discarding invalid remembered invoice asset:', error);
    discardRememberedAsset();
    return null;
  }
}

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

/** One fresh key per submit attempt, sent as the Idempotency-Key header. */
function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export default function InvoiceForm({ onSuccess, userWallet }: InvoiceFormProps) {
  const amountInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const memoInput = useRef<HTMLInputElement>(null);
  const [submitError, setSubmitError] = useState('');
  const [memoSubmitted, setMemoSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  // `loading` only disables the button after a re-render, so a fast double
  // click could start two requests; this ref blocks re-entry synchronously.
  const submittingRef = useRef(false);
  const [amount, setAmount] = useState('');
  const [draftReadyFor, setDraftReadyFor] = useState<string | null>(null);
  const [rememberedAssetCode, setRememberedAssetCode] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineInput[]>([
    { label: '', quantity: '1', unitPrice: '' },
  ]);
  const [assetCode, setAssetCode] = useState('XLM');
  const [description, setDescription] = useState('');
  const [memo, setMemo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [muxedAddress, setMuxedAddress] = useState('');
  const [muxedAddressError, setMuxedAddressError] = useState('');
  const [trustlineWarning, setTrustlineWarning] = useState<string | null>(null);
  const [serverWarning, setServerWarning] = useState<string | null>(null);
  const [acknowledgedWarning, setAcknowledgedWarning] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [muxedAddress, setMuxedAddress] = useState('');
  const [muxedAddressError, setMuxedAddressError] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [expiryError, setExpiryError] = useState('');
  const [draftReadyFor, setDraftReadyFor] = useState<string | null>(null);
  const [walletNetwork, setWalletNetwork] = useState<WalletNetwork>('UNKNOWN');
  const [networkMismatch, setNetworkMismatch] = useState(false);
  const configuredNetwork = getConfiguredNetwork();

  useEffect(() => {
    const storedAssetCode = readRememberedAsset();
    setAssetCode(storedAssetCode ?? 'XLM');
    setRememberedAssetCode(storedAssetCode);
  }, []);

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
    setDraftReadyFor(null);
    if (!userWallet || typeof window === 'undefined') {
      setAmount('');
      setDescription('');
      setCustomerName('');
      return;
    }

    const storageKey = `${draftStoragePrefix}${userWallet}`;
    try {
      const rawDraft = window.localStorage.getItem(storageKey);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft) as Partial<InvoiceDraft>;
        setAmount(typeof draft.amount === 'string' ? draft.amount : '');
        setDescription(typeof draft.description === 'string' ? draft.description : '');
        setCustomerName(typeof draft.customerName === 'string' ? draft.customerName : '');
      } else {
        setAmount('');
        setDescription('');
        setCustomerName('');
      }
    } catch {
      setAmount('');
      setDescription('');
      setCustomerName('');
    }
    setDraftReadyFor(userWallet);
  }, [userWallet]);

  useEffect(() => {
    if (!userWallet || draftReadyFor !== userWallet || typeof window === 'undefined') return;
    const draft: InvoiceDraft = { amount, description, customerName };
    try {
      window.localStorage.setItem(`${draftStoragePrefix}${userWallet}`, JSON.stringify(draft));
    } catch {
      // Draft persistence is best effort and must never block invoice creation.
    }
  }, [amount, description, customerName, draftReadyFor, userWallet]);

  useEffect(() => {
    let cancelled = false;
    const recheckNetwork = async () => {
      if (!userWallet) {
        if (!cancelled) {
          setWalletNetwork('UNKNOWN');
          setNetworkMismatch(false);
        }
        return;
      }
      const wallet = await getWalletNetwork();
      if (!cancelled) {
        setWalletNetwork(wallet);
        setNetworkMismatch(getNetworkMismatch(wallet, configuredNetwork));
      }
    };
    void recheckNetwork();
    const interval = window.setInterval(recheckNetwork, 500);
    window.addEventListener('focus', recheckNetwork);
    document.addEventListener('visibilitychange', recheckNetwork);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', recheckNetwork);
      document.removeEventListener('visibilitychange', recheckNetwork);
    };
  }, [userWallet, configuredNetwork]);

  useEffect(() => {
    setTrustlineWarning(null);
    setServerWarning(null);
    setAcknowledgedWarning(false);
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
    if (hasTooManyDecimals(value)) {
      setAmountError('Amount can have at most 7 decimal places');
    } else if (value && (isNaN(parseFloat(value)) || parseFloat(value) <= 0)) {
      setAmountError('Amount must be greater than 0');
    } else {
      setAmountError('');
    }
  };

  const handleExpiryChange = (value: string) => {
    setExpiresAt(value);
    if (value && !isFutureExpiry(value)) {
      setExpiryError('Expiry must be in the future');
    } else {
      setExpiryError('');
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
    setSubmitError('');

    if (submittingRef.current) {
      return;
    }

    if (!userWallet) {
      setSubmitError('Connect your wallet first');
      toast.error('Connect your wallet first');
      return;
    }

    const enteredMuxedAddress = muxedAddress.trim();
    if (enteredMuxedAddress) {
      if (!StrKey.isValidMed25519PublicKey(enteredMuxedAddress)) {
        setMuxedAddressError('Enter a valid Stellar muxed address');
        return;
      }
      if (extractBaseAddress(enteredMuxedAddress) !== userWallet) {
        setMuxedAddressError('The muxed address must belong to your connected wallet');
        return;
      }
    }
    setMuxedAddressError('');

    const chosenAsset = getAssetByCode(assetCode);
    if (!chosenAsset) {
      setSubmitError('Select a supported asset');
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amount || amountNum <= 0 || !Number.isFinite(amountNum)) {
      setAmountError('Enter a valid amount');
      amountInput.current?.focus();
      return;
    }
    if (hasTooManyDecimals(amount)) {
      setAmountError('Amount can have at most 7 decimal places');
      amountInput.current?.focus();
      return;
    }
    setAmountError('');

    const expiryValue = expiresAt.trim();
    const expiryMs = expiryValue ? Date.parse(expiryValue) : undefined;
    if (expiryValue && (expiryMs === undefined || !isFutureExpiry(expiryValue))) {
      setExpiryError('Expiry must be in the future');
      return;
    }
    setExpiryError('');

    if (memoTooLong) {
      setMemoSubmitted(true);
      memoInput.current?.focus();
      toast.error(`Memo must be at most ${MAX_MEMO_BYTES} bytes`);
      return;
    }

    if (customerEmail.trim() && !isValidEmail(customerEmail.trim())) {
      setEmailError('Enter a valid client email');
      emailInput.current?.focus();
      return;
    }
    setEmailError('');

    const muxedDestination = muxedAddress.trim();
    if (
      muxedDestination &&
      (!StrKey.isValidMed25519PublicKey(muxedDestination) ||
        extractBaseAddress(muxedDestination) !== userWallet)
    ) {
      setMuxedAddressError('Enter a valid M address for your connected wallet');
      return;
    }
    setMuxedAddressError('');

    submittingRef.current = true;
    setLoading(true);
    const idempotencyKey = newIdempotencyKey();
    try {
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
        sellerPublicKey: enteredMuxedAddress || userWallet,
        sellerName: sellerName.trim() || undefined,
        description: description || undefined,
        memo: memo || undefined,
        customerName: customerName.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        ...(acknowledgedWarning ? { acknowledgeNoTrustline: true } : {}),
      }, { idempotencyKey });

      try {
        window.localStorage.setItem(
          rememberedAssetStorageKey,
          JSON.stringify({
            assetCode: selectedAsset.code,
            assetIssuer: selectedAsset.issuer ?? null,
          }),
        );
        setRememberedAssetCode(selectedAsset.code);
      } catch (error) {
        console.warn('Could not remember invoice asset:', error);
        toast.warning('Invoice created, but this asset could not be remembered in this browser');
      }

      toast.success('Invoice created');
      onSuccess?.(result.data);
      try {
        if (typeof window !== 'undefined' && userWallet) {
          window.localStorage.removeItem(`${draftStoragePrefix}${userWallet}`);
        }
      } catch {
        // Draft cleanup is best effort after a successful create.
      }
      setAmount('');
      setLineItems([{ label: '', quantity: '1', unitPrice: '' }]);
      setDescription('');
      setMemo('');
      setCustomerName('');
      setCustomerEmail('');
      setSellerName('');
      setMuxedAddress('');
      setMuxedAddressError('');
      setAmountError('');
      setEmailError('');
      setMuxedAddressError('');
      setExpiryError('');
      setMemoSubmitted(false);
    } catch (error: any) {
      const data = error.response?.data;
      if (data?.code === 'SELLER_TRUSTLINE_WARNING' && typeof data.warning === 'string') {
        // The seller can acknowledge the missing trustline and retry.
        setServerWarning(data.warning);
      } else {
        const message = data?.error || 'Failed to create invoice';
        setSubmitError(message);
        toast.error(message);
      }
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const clearRememberedAsset = () => {
    if (!discardRememberedAsset()) {
      toast.error('Could not clear the remembered asset from this browser');
      return;
    }
    setRememberedAssetCode(null);
    setAssetCode('XLM');
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      {submitError && <p role="alert" className="text-sm text-red-600">{submitError}</p>}
      <div>
        <label className="label" htmlFor="invoice-amount">Invoice Amount *</label>
        <div className="flex gap-3 flex-col sm:flex-row sm:items-end">
          <input
            id="invoice-amount"
            ref={amountInput}
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
          <div className="relative">
            <label className="label" htmlFor="invoice-asset">Asset</label>
            <select
              id="invoice-asset"
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
            <div className="absolute left-3 bottom-3 pointer-events-none">
              <AssetLogo code={assetCode} size={24} showName={false} />
            </div>
            {rememberedAssetCode && (
              <button
                type="button"
                onClick={clearRememberedAsset}
                className="mt-1 block text-xs text-cyan-700 underline underline-offset-2"
              >
                Clear remembered asset
              </button>
            )}
          </div>
        </div>
        {amountError && (
          <p id={amountErrorId} role="alert" className="text-sm text-red-600 mt-1">
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
        {serverWarning && (
          <div
            className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
            role="alert"
          >
            <p className="font-semibold">Seller account is not ready to receive {assetCode}</p>
            <p className="mt-1 break-all">{serverWarning}</p>
            <label className="mt-2 flex items-start gap-2 font-medium">
              <input
                type="checkbox"
                checked={acknowledgedWarning}
                onChange={(e) => setAcknowledgedWarning(e.target.checked)}
                aria-label={`I understand the seller has no ${assetCode} trustline`}
              />
              <span>I understand and want to create the invoice anyway (or add the trustline first).</span>
            </label>
          </div>
        )}
      </div>

      <div>
        <label className="label" htmlFor="seller-muxed-address">
          Muxed payment address (optional)
        </label>
        <input
          id="seller-muxed-address"
          type="text"
          className={`input text-sm ${muxedAddressError ? 'border-red-500' : ''}`}
          placeholder="M... address for this invoice"
          value={muxedAddress}
          onChange={(e) => {
            setMuxedAddress(e.target.value);
            setMuxedAddressError('');
          }}
          aria-invalid={Boolean(muxedAddressError)}
          aria-describedby={muxedAddressError ? 'muxed-address-error' : undefined}
        />
        {muxedAddressError && (
          <p id="muxed-address-error" className="text-sm text-red-600 mt-1">
            {muxedAddressError}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          The payment address must belong to your connected wallet.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="invoice-description">Description</label>
        <textarea
          id="invoice-description"
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
          ref={memoInput}
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
          <p id={memoErrorId} role={memoSubmitted ? 'alert' : undefined} className="text-sm text-red-600 mt-1">
            Memo is {memoBytes} bytes. Stellar allows at most {MAX_MEMO_BYTES} bytes, and
            non-ASCII characters use more than one byte each.
          </p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="invoice-seller-name">
          Your display name (optional)
        </label>
        <input
          id="invoice-seller-name"
          type="text"
          className="input text-sm"
          placeholder="Your name or business"
          value={sellerName}
          onChange={(e) => setSellerName(e.target.value)}
          maxLength={80}
        />
      </div>

      <div>
        <label className="label" htmlFor="invoice-expiry">
          Expiry (optional)
        </label>
        <input
          id="invoice-expiry"
          type="datetime-local"
          className={`input text-sm ${expiryError ? 'border-red-500' : ''}`}
          value={expiresAt}
          onChange={(e) => handleExpiryChange(e.target.value)}
          aria-invalid={Boolean(expiryError)}
          aria-describedby={expiryError ? 'expiry-error' : 'expiry-hint'}
        />
        {expiryError ? (
          <p id="expiry-error" role="alert" className="text-sm text-red-600 mt-1">
            {expiryError}
          </p>
        ) : (
          <p id="expiry-hint" className="text-xs text-gray-500 mt-1">
            Must be in the future. Leave empty to use the seven-day default.
          </p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="invoice-client-name">Client name (optional)</label>
        <input
          id="invoice-client-name"
          type="text"
          className="input text-sm"
          placeholder="Client or company name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          maxLength={255}
        />
      </div>

      <div>
        <label className="label" htmlFor="invoice-client-email">Client email (optional)</label>
        <input
          id="invoice-client-email"
          ref={emailInput}
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
          <p id="email-error" role="alert" className="text-sm text-red-600 mt-1">
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
        disabled={loading}
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
