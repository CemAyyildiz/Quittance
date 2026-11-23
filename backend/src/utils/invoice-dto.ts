export interface InvoiceDTO {
  id: string;
  sellerPublicKey: string;
  amount: number;
  lineItems?: Array<{ label: string; quantity: number; unitPrice: number }>;
  assetCode: string;
  assetIssuer?: string;
  memo: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  paymentTxHash?: string;
  payerPublicKey?: string;
  ledger?: number;
  createdAt: string;
  paidAt?: string;
  expiresAt: string;
  originalExpiresAt: string;
  expiryExtended: boolean;
}

export function toInvoiceDTO(invoice: {
  id: string;
  sellerPublicKey: string;
  amount: number;
  lineItems?: Array<{ label: string; quantity: number; unitPrice: number }>;
  assetCode: string;
  assetIssuer?: string;
  memo: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  paymentTxHash?: string;
  payerPublicKey?: string;
  ledger?: number;
  createdAt: Date;
  paidAt?: Date;
  expiresAt: Date;
  originalExpiresAt?: Date;
  expiryExtended?: boolean;
}): InvoiceDTO {
  const originalExpiresAt = invoice.originalExpiresAt ?? invoice.expiresAt;
  return {
    id: invoice.id,
    sellerPublicKey: invoice.sellerPublicKey,
    amount: invoice.amount,
    lineItems: invoice.lineItems ?? [
      {
        label: invoice.description?.trim() || 'Item',
        quantity: 1,
        unitPrice: invoice.amount,
      },
    ],
    assetCode: invoice.assetCode,
    assetIssuer: invoice.assetIssuer,
    memo: invoice.memo,
    description: invoice.description,
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail,
    status: invoice.status,
    paymentTxHash: invoice.paymentTxHash,
    payerPublicKey: invoice.payerPublicKey,
    ledger: invoice.ledger,
    createdAt: invoice.createdAt.toISOString(),
    paidAt: invoice.paidAt?.toISOString(),
    expiresAt: invoice.expiresAt.toISOString(),
    originalExpiresAt: originalExpiresAt.toISOString(),
    expiryExtended: invoice.expiryExtended ?? false,
  };
}
