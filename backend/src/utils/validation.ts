import { z } from 'zod';

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

// Invoice creation schema
export const createInvoiceSchema = z.object({
  amount: amountSchema,
  assetCode: z.string().default('XLM').optional(),
  assetIssuer: z.string().optional(),
  description: z.string().max(500).optional(),
  customerName: z.string().max(255).optional(),
  customerEmail: z.string().email().optional(),
  sellerName: z.string().max(255).optional(),
  sellerEmail: z.string().email().optional(),
  expiresInDays: z.number().min(1).max(365).default(7).optional(),
  sellerPublicKey: stellarPublicKeySchema, // Dinamik seller!
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
  paymentSchema,
  stellarPublicKeySchema,
  verifyTxHashSchema,
};

