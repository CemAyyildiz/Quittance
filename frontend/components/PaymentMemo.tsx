'use client';

import CopyButton from './CopyButton';

interface PaymentMemoProps {
  /** The invoice memo exactly as it is verified on the backend. */
  memo: string | null | undefined;
}

/**
 * The memo a payer must include for a manual Stellar payment to settle.
 *
 * The stored memo is always shown, so a payer can select it by hand when the
 * clipboard is unavailable. A whitespace-only memo is not a usable reference,
 * so it is shown without a copy control.
 */
export default function PaymentMemo({ memo }: PaymentMemoProps) {
  const value = memo ?? '';
  const copyable = value.trim().length > 0;

  return (
    <div>
      <p className="text-xs text-gray-600 mb-1">Memo (Required)</p>
      <div className="flex items-center gap-2">
        <code
          data-testid="payment-memo"
          className="flex-1 text-xs bg-white p-2 rounded border font-semibold break-all"
        >
          {value}
        </code>
        {copyable && (
          <CopyButton
            text={value}
            label="Copy"
            ariaLabel="Copy memo"
            data-testid="copy-memo"
          />
        )}
      </div>
      {!copyable && (
        <p className="text-xs text-gray-500 mt-1">
          This invoice has no usable memo text to copy.
        </p>
      )}
    </div>
  );
}
