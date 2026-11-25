import { createHash } from 'crypto';
import { remainingInvoiceAmount } from './verify-invoice-payment';

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
  sellerName?: string;
  amount: number;
  lineItems?: Array<{ label: string; quantity: number; unitPrice: number }>;
  assetCode: string;
  assetIssuer?: string;
  memo: string;
  description?: string;
  lineItems?: unknown[];
  customerName?: string;
  customerEmail?: string;
  status: 'PENDING' | 'PAID' | 'REFUNDED' | 'EXPIRED' | 'CANCELLED';
  paymentTxHash?: string;
  payerPublicKey?: string;
  ledger?: number;
  createdAt: string;
  paidAt?: string;
  refundTxHash?: string;
  refundedAt?: string;
  refundLedger?: number;
  expiresAt: string;
  originalExpiresAt: string;
  expiryExtended: boolean;
  payments: Array<{ txHash: string; amount: string; payerPublicKey: string; ledger: number; paidAt: string }>;
  receivedAmount: string;
  remainingAmount: string;
  /** Hex SHA-256 of the canonical proof string; only set when the invoice is paid. */
  proofDigest?: string;
  /** Documented canonical field string used to compute proofDigest; only set when paid. */
  proofCanonical?: string;
}

export function toInvoiceDTO(invoice: {
  id: string;
  sellerPublicKey: string;
  sellerMuxedAddress?: string;
  amount: number;
  lineItems?: Array<{ label: string; quantity: number; unitPrice: number }>;
  assetCode: string;
  /** Empty string for native XLM — never the word "null". */
  assetIssuer: string;
  memo: string;
  sellerPublicKey: string;
  payerPublicKey: string;
  paymentTxHash: string;
}

export interface ToInvoiceDTOOptions {
  /** Stellar network label (e.g. TESTNET / PUBLIC). Defaults to STELLAR_NETWORK or TESTNET. */
  network?: string;
}

/**
 * Build the canonical proof string.
 *
 * Field order is fixed (one field per line, joined by `\n`):
 * 1. network
 * 2. invoice id
 * 3. amount (decimal string via String(amount))
 * 4. asset code
 * 5. issuer (empty string for XLM / missing issuer — never the word "null")
 * 6. memo
 * 7. seller public key
 * 8. payer public key
 * 9. transaction hash
 */
export function buildProofCanonicalString(fields: ProofDigestFields): string {
  return [
    fields.network,
    fields.invoiceId,
    String(fields.amount),
    fields.assetCode,
    fields.assetIssuer,
    fields.memo,
    fields.sellerPublicKey,
    fields.payerPublicKey,
    fields.paymentTxHash,
  ].join('\n');
}

/**
 * Hex SHA-256 over the documented canonical proof string.
 * Same inputs always produce the same digest; changing payer or hash differs.
 */
export function computeProofDigest(fields: ProofDigestFields): string {
  return createHash('sha256')
    .update(buildProofCanonicalString(fields), 'utf8')
    .digest('hex');
}

function resolveNetwork(options?: ToInvoiceDTOOptions): string {
  return options?.network || process.env.STELLAR_NETWORK || 'TESTNET';
}

export function toInvoiceDTO(
  invoice: {
    id: string;
    sellerPublicKey: string;
    sellerName?: string;
    amount: number;
    assetCode: string;
    assetIssuer?: string;
    memo: string;
    description?: string;
    lineItems?: unknown[];
    customerName?: string;
    customerEmail?: string;
    status: 'PENDING' | 'PAID' | 'REFUNDED' | 'EXPIRED' | 'CANCELLED';
    paymentTxHash?: string;
    payerPublicKey?: string;
    ledger?: number;
    createdAt: Date;
    paidAt?: Date;
    refundTxHash?: string;
    refundedAt?: Date;
    refundLedger?: number;
    expiresAt: Date;
    originalExpiresAt?: Date;
    expiryExtended?: boolean;
    payments?: Array<{ txHash: string; amount: string; payerPublicKey: string; ledger: number; paidAt: Date }>;
    receivedAmount?: string;
  },
  options?: ToInvoiceDTOOptions,
): InvoiceDTO {
  const originalExpiresAt = invoice.originalExpiresAt ?? invoice.expiresAt;
  const dto: InvoiceDTO = {
    id: invoice.id,
    sellerPublicKey: invoice.sellerPublicKey,
    ...(invoice.sellerMuxedAddress ? { sellerMuxedAddress: invoice.sellerMuxedAddress } : {}),
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
    lineItems: invoice.lineItems,
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail,
    status: invoice.status,
    paymentTxHash: invoice.paymentTxHash,
    payerPublicKey: invoice.payerPublicKey,
    ledger: invoice.ledger,
    createdAt: invoice.createdAt.toISOString(),
    paidAt: invoice.paidAt?.toISOString(),
    refundTxHash: invoice.refundTxHash,
    refundedAt: invoice.refundedAt?.toISOString(),
    refundLedger: invoice.refundLedger,
    expiresAt: invoice.expiresAt.toISOString(),
    originalExpiresAt: originalExpiresAt.toISOString(),
    expiryExtended: invoice.expiryExtended ?? false,
    payments: (invoice.payments ?? []).map((payment) => ({
      ...payment,
      paidAt: payment.paidAt.toISOString(),
    })),
    receivedAmount: invoice.receivedAmount ?? '0',
    remainingAmount: remainingInvoiceAmount(invoice.amount, invoice.receivedAmount),
  };

  // The label belongs to this invoice; it must never become payment identity.
  if (invoice.sellerName?.trim()) dto.sellerName = invoice.sellerName.trim();

  if (
    (invoice.status === 'PAID' || invoice.status === 'REFUNDED') &&
    invoice.paymentTxHash &&
    invoice.payerPublicKey
  ) {
    const proofFields: ProofDigestFields = {
      network: resolveNetwork(options),
      invoiceId: invoice.id,
      amount: invoice.amount,
      assetCode: invoice.assetCode,
      assetIssuer: invoice.assetIssuer ?? '',
      memo: invoice.memo,
      sellerPublicKey: invoice.sellerPublicKey,
      payerPublicKey: invoice.payerPublicKey,
      paymentTxHash: invoice.paymentTxHash,
    };
    dto.proofCanonical = buildProofCanonicalString(proofFields);
    dto.proofDigest = computeProofDigest(proofFields);
  }

  return dto;
}
