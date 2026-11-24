import { z } from 'zod';
import { MAX_MEMO_BYTES, getMemoByteLength } from './memo';

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
}, z.number().positive().max(1000000000));

// Stellar public key validation
export const stellarPublicKeySchema = z.string()
  .length(56)
  .regex(/^G[A-Z2-7]{55}$/, 'Invalid Stellar public key format');

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

// Invoice creation schema. Comma decimals are accepted and normalised before
// the stroop check, so "10,5" and "10.5" are the same amount.
export const createInvoiceSchema = z
  .object({
    amount: amountSchema,
    assetCode: z.string().default('XLM').optional(),
    assetIssuer: stellarPublicKeySchema.optional(),
    description: z.string().max(500).optional(),
    customerName: z.string().max(255).optional(),
    customerEmail: z.string().email().optional(),
    sellerName: z.string().max(255).optional(),
    sellerEmail: z.string().email().optional(),
    expiresInDays: z.number().min(1).max(365).default(7).optional(),
    sellerPublicKey: stellarPublicKeySchema, // Dinamik seller!
    // Optional caller-supplied memo, still bounded by the Stellar 28-byte limit.
    memo: memoByteLengthSchema.optional(),
    // The form sets this only after the seller explicitly acknowledges the
    // "no trustline" warning returned by the create endpoint.
    acknowledgeNoTrustline: z.boolean().optional().default(false),
  })
  .superRefine((value, ctx) => {
    const code = (value.assetCode ?? 'XLM').toUpperCase();
    if (code !== 'XLM' && !value.assetIssuer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['assetIssuer'],
        message: `${code} invoices require the issuing account's Stellar public key`,
      });
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

