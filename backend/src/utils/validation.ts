import { z } from 'zod';
import { StrKey } from '@stellar/stellar-sdk';
import { MAX_MEMO_BYTES, getMemoByteLength } from './memo';
import { amountsMatch, isValidAmount } from './amount-compare';

export interface ParsedAmount { decimal: string; stroops: bigint; }
export function parseAmount(input: string | number): ParsedAmount | undefined {
  const raw = typeof input === 'number' ? String(input) : input.trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(raw) || (raw.match(/[.,]/g) ?? []).length > 1) return undefined;
  const decimal = raw.replace(',', '.');
  const [whole, fraction = ''] = decimal.split('.');
  if (fraction.length > 7) return undefined;
  const stroops = BigInt(whole) * 10_000_000n + BigInt(fraction.padEnd(7, '0') || '0');
  if (stroops <= 0n || stroops > 10_000_000_000_000_000n) return undefined;
  return { decimal, stroops };
}
const amountSchema = z.preprocess((value) => {
  if (typeof value !== 'string' && typeof value !== 'number') return value;
  const parsed = parseAmount(value);
  return parsed ? Number(parsed.decimal) : value;
}, z.number().positive().max(1000000000).refine(isValidAmount, {
  message: 'Amount must have at most 7 decimal places',
}));

// Stellar public key validation
export const stellarPublicKeySchema = z.string()
  .length(56)
  .regex(/^G[A-Z2-7]{55}$/, 'Invalid Stellar public key format');

// M addresses include a checksum and an encoded muxed id; validate both with
// the Stellar SDK rather than accepting a string with the right prefix.
export const sellerAddressSchema = z.string().superRefine((address, ctx) => {
  if (StrKey.isValidMed25519PublicKey(address)) return;
  const base = stellarPublicKeySchema.safeParse(address);
  if (!base.success) {
    for (const issue of base.error.issues) {
      ctx.addIssue({ code: 'custom', message: issue.message });
    }
  }
});

// Stellar transaction hash validation (64-char hex)
export const verifyTxHashSchema = z.string()
  .length(64)
  .regex(/^[0-9a-fA-F]{64}$/, 'Invalid Stellar transaction hash format');

// Stellar text memo: at most 28 bytes when encoded as UTF-8 (not 28 characters)
export const memoByteLengthSchema = z
  .string()
  .refine((memo) => getMemoByteLength(memo) <= MAX_MEMO_BYTES, {
    message: `Memo must be at most ${MAX_MEMO_BYTES} bytes (UTF-8).`,
  });

export const MAX_STELLAR_DECIMALS = 7;
export const MAX_LINE_ITEMS = 20;

export const lineItemSchema = z.object({
  label: z.string().trim().min(1).max(255),
  quantity: z.number().finite().positive(),
  unitPrice: z.number().finite().positive(),
}).superRefine((line, ctx) => {
  for (const [field, value] of [
    ['quantity', line.quantity],
    ['unitPrice', line.unitPrice],
  ] as const) {
    const [whole, fraction = ''] = String(value).split('.');
    if (fraction.length > MAX_STELLAR_DECIMALS) {
      ctx.addIssue({
        code: 'custom',
        path: [field],
        message: `Must have no more than ${MAX_STELLAR_DECIMALS} decimal places`,
      });
    }
  }
});

export type InvoiceLineItem = z.infer<typeof lineItemSchema>;

export function roundStellarAmount(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000_000) / 10_000_000;
}

export function getLineItemAmount(line: InvoiceLineItem): number {
  return roundStellarAmount(line.quantity * line.unitPrice);
}

export function sumLineItems(lineItems: InvoiceLineItem[]): number {
  return roundStellarAmount(
    lineItems.reduce((sum, line) => sum + getLineItemAmount(line), 0),
  );
}

// Invoice creation schema
export const createInvoiceSchema = z.object({
  amount: amountSchema,
  lineItems: z.array(lineItemSchema).min(1).max(MAX_LINE_ITEMS).optional(),
  assetCode: z.string().default('XLM').optional(),
  assetIssuer: stellarPublicKeySchema.optional(),
  description: z.string().max(500).optional(),
  customerName: z.string().max(255).optional(),
  customerEmail: z.string().email().optional(),
  sellerName: z.string().trim().max(80).optional().transform((name) => name || undefined),
  sellerEmail: z.string().email().optional(),
  expiresInDays: z.number().min(1).max(365).default(7).optional(),
  sellerPublicKey: sellerAddressSchema,
  memo: memoByteLengthSchema.optional(),
}).superRefine((invoice, ctx) => {
  if (
    invoice.lineItems &&
    amountsMatch(sumLineItems(invoice.lineItems), invoice.amount) === false
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['lineItems'],
      message: 'Line item total must match invoice amount',
    });
  }
  if (invoice.assetCode && invoice.assetCode !== 'XLM') {
    if (!invoice.assetIssuer || !/^G[A-Z2-7]{55}$/.test(invoice.assetIssuer)) {
      ctx.addIssue({
        code: 'custom',
        path: ['assetIssuer'],
        message: 'Credit assets require a valid Stellar issuer public key',
      });
    }
  }
});

// Payment verification schema
export const paymentSchema = z.object({
  invoiceId: z.string().uuid(),
  txHash: z.string().length(64),
  payerPublicKey: stellarPublicKeySchema,
  amount: z.number().positive(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;

export default {
  createInvoiceSchema,
  memoByteLengthSchema,
  paymentSchema,
  stellarPublicKeySchema,
  verifyTxHashSchema,
};

