'use client';

import QRCodeDisplay from '@/components/QRCodeDisplay';

export interface PaymentQrCodesProps {
  paymentUrl: string;
  stellarPaymentUri: string;
  size?: number;
}

/**
 * Invoice pay surfaces show two encodings:
 * - Payment link: HTTPS URL to the Quittance pay page (browser / share).
 * - SEP-0007 URI: web+stellar:pay… for compatible Stellar wallets.
 * Copy actions always use these strings, never PNG data URLs.
 */
export default function PaymentQrCodes({
  paymentUrl,
  stellarPaymentUri,
  size = 200,
}: PaymentQrCodesProps) {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-gray-700 text-center mb-3">
          Payment link
        </p>
        <p className="text-xs text-gray-500 text-center mb-4 max-w-sm mx-auto">
          Opens the Quittance pay page in a browser. Share this URL with your client.
        </p>
        <QRCodeDisplay value={paymentUrl} size={size} />
      </div>

      <div className="border-t pt-8">
        <p className="text-sm font-medium text-gray-700 text-center mb-3">
          SEP-0007 wallet payment
        </p>
        <p className="text-xs text-gray-500 text-center mb-4 max-w-sm mx-auto">
          Scan with a Stellar wallet that supports SEP-0007 to pre-fill destination, amount, asset, and memo.
        </p>
        <QRCodeDisplay value={stellarPaymentUri} size={size} />
      </div>
    </div>
  );
}
