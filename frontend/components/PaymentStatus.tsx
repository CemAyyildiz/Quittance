'use client';

import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

interface PaymentStatusProps {
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  txHash?: string;
}

export default function PaymentStatus({ status, txHash }: PaymentStatusProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'PAID':
        return <CheckCircle aria-hidden="true" className="w-16 h-16 text-green-500" />;
      case 'EXPIRED':
        return <XCircle aria-hidden="true" className="w-16 h-16 text-red-500" />;
      case 'CANCELLED':
        return <XCircle aria-hidden="true" className="w-16 h-16 text-gray-500" />;
      default:
        return <Clock aria-hidden="true" className="w-16 h-16 text-yellow-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'PAID':
        return {
          title: 'Payment Successful!',
          description: 'This invoice has been paid.',
          color: 'text-green-600',
        };
      case 'EXPIRED':
        return {
          title: 'Invoice Expired',
          description: 'This invoice is no longer valid.',
          color: 'text-red-600',
        };
      case 'CANCELLED':
        return {
          title: 'Invoice Cancelled',
          description: 'This invoice has been cancelled.',
          color: 'text-gray-600',
        };
      default:
        return {
          title: 'Waiting for Payment',
          description: 'Complete the payment to proceed.',
          color: 'text-yellow-600',
        };
    }
  };

  const statusInfo = getStatusMessage();
  const horizonUrl =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'TESTNET'
      ? 'https://stellar.expert/explorer/testnet'
      : 'https://stellar.expert/explorer/public';

  return (
    <div className="card text-center">
      <div className="flex flex-col items-center gap-4">
        {getStatusIcon()}

        <div>
          <h2 className={`text-2xl font-bold ${statusInfo.color}`}>{statusInfo.title}</h2>
          <p className="text-gray-600 mt-2">{statusInfo.description}</p>
        </div>

        {txHash && (
          <a
            href={`${horizonUrl}/tx/${txHash}`}
            aria-label={`View transaction ${txHash} on Stellar Explorer`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline mt-4"
          >
            View on Stellar Explorer
          </a>
        )}
      </div>
    </div>
  );
}
