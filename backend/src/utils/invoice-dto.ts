import type { StatusEvent, StatusEventStatus } from '../storage/memory-storage';

/** JSON shape of one append-only status history row. */
export interface StatusHistoryEntryDTO {
  status: StatusEventStatus;
  at: string;
  txHash?: string;
}

export function toStatusHistoryDTO(event: StatusEvent): StatusHistoryEntryDTO {
  return {
    status: event.status,
    at: event.at.toISOString(),
    ...(event.txHash ? { txHash: event.txHash } : {}),
  };
}

export interface InvoiceDTO {
  id: string;
  sellerPublicKey: string;
  amount: number;
  assetCode: string;
  assetIssuer?: string;
  memo: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  paymentTxHash?: string;
  payerPublicKey?: string;
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
  assetCode: string;
  assetIssuer?: string;
  memo: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  paymentTxHash?: string;
  payerPublicKey?: string;
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
    assetCode: invoice.assetCode,
    assetIssuer: invoice.assetIssuer,
    memo: invoice.memo,
    description: invoice.description,
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail,
    status: invoice.status,
    paymentTxHash: invoice.paymentTxHash,
    payerPublicKey: invoice.payerPublicKey,
    createdAt: invoice.createdAt.toISOString(),
    paidAt: invoice.paidAt?.toISOString(),
    expiresAt: invoice.expiresAt.toISOString(),
    originalExpiresAt: originalExpiresAt.toISOString(),
    expiryExtended: invoice.expiryExtended ?? false,
  };
}
