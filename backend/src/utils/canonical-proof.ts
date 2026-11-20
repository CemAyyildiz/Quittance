/**
 * TypeScript mirror of contracts/quittance_receipt_hash's canonical digest.
 *
 * The byte layout here MUST stay identical to `src/encoding.rs` in that crate
 * (domain block, then version, then tagged length-prefixed fields). The same
 * digest is what the seller writes on chain and what the API recomputes before
 * a proof is anchored, so one byte of drift would make every anchor fail.
 */
import { createHash } from 'crypto';

import { NETWORK_PASSPHRASE } from '../config/stellar';
import { amountToStroops } from './amount-compare';

export const RECEIPT_DOMAIN = 'Quittance/ReceiptHash/v1/STELLAR';
export const RECEIPT_VERSION = 1;
export const DIGEST_HEX_LENGTH = 64;

export enum AnchorErrorCode {
  INVOICE_NOT_PAID = 'INVOICE_NOT_PAID',
  ALREADY_ANCHORED = 'ALREADY_ANCHORED',
  DIGEST_MISMATCH = 'DIGEST_MISMATCH',
  INVALID_TX_HASH = 'INVALID_TX_HASH',
  INVOICE_NOT_FOUND = 'INVOICE_NOT_FOUND',
}

export class AnchorError extends Error {
  constructor(public readonly code: AnchorErrorCode, message: string) {
    super(message);
    this.name = 'AnchorError';
  }
}

export interface CanonicalProofInvoice {
  id: string;
  paymentTxHash?: string;
  paymentLedger?: number;
  sellerPublicKey: string;
  payerPublicKey?: string;
  amount: number;
  assetCode: string;
  assetIssuer?: string;
  memo: string;
}

function u32be(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0, 0);
  return buffer;
}

function i64be(value: bigint): Buffer {
  const buffer = Buffer.alloc(8);
  let remaining = BigInt.asIntN(64, value);
  for (let index = 7; index >= 0; index -= 1) {
    buffer[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return buffer;
}

function field(tag: string, value: Buffer): Buffer {
  const tagBytes = Buffer.from(tag, 'utf8');
  return Buffer.concat([u32be(tagBytes.length), tagBytes, u32be(value.length), value]);
}

function optional(value: string | null | undefined): Buffer {
  if (value === undefined || value === null) {
    return Buffer.from([0x00]);
  }
  const bytes = Buffer.from(value, 'utf8');
  return Buffer.concat([Buffer.from([0x01]), u32be(bytes.length), bytes]);
}

/** Compute the domain-separated SHA-256 digest for a paid invoice. */
export function computeCanonicalDigest(invoice: CanonicalProofInvoice): string {
  if (!invoice.paymentTxHash || !/^[0-9a-fA-F]{64}$/.test(invoice.paymentTxHash)) {
    throw new Error('Invoice has no valid payment transaction hash');
  }

  const domainBytes = Buffer.from(RECEIPT_DOMAIN, 'utf8');
  const txHashBytes = Buffer.from(invoice.paymentTxHash, 'hex');
  const amountStroops = amountToStroops(invoice.amount);
  const assetCode = invoice.assetCode || 'XLM';

  const preimage = Buffer.concat([
    u32be(domainBytes.length),
    domainBytes,
    u32be(RECEIPT_VERSION),
    field('network', Buffer.from(NETWORK_PASSPHRASE, 'utf8')),
    field('tx_hash', txHashBytes),
    field('ledger', u32be(invoice.paymentLedger ?? 0)),
    field('seller', Buffer.from(invoice.sellerPublicKey ?? '', 'utf8')),
    field('payer', Buffer.from(invoice.payerPublicKey ?? '', 'utf8')),
    field('amount', i64be(amountStroops)),
    field('asset_code', Buffer.from(assetCode, 'utf8')),
    field('asset_issuer', optional(assetCode === 'XLM' ? undefined : invoice.assetIssuer)),
    field('memo', optional(invoice.memo)),
    field('invoice_id', optional(invoice.id)),
  ]);

  return createHash('sha256').update(preimage).digest('hex');
}

/** True when a submitted digest is exactly the invoice's canonical digest. */
export function canonicalDigestMatches(
  invoice: CanonicalProofInvoice,
  digest: string,
): boolean {
  if (typeof digest !== 'string' || !new RegExp(`^[0-9a-fA-F]{${DIGEST_HEX_LENGTH}}$`).test(digest)) {
    return false;
  }
  try {
    return computeCanonicalDigest(invoice).toLowerCase() === digest.trim().toLowerCase();
  } catch {
    return false;
  }
}

/** Configured Soroban contract id the seller calls to write the anchor. */
export function getAnchorContractId(): string | undefined {
  const id = process.env.RECEIPT_ANCHOR_CONTRACT_ID || process.env.ANCHOR_CONTRACT_ID;
  return id && id.trim() !== '' ? id.trim() : undefined;
}
