import { z } from 'zod';
import { isValidAmount } from './amount-compare';
import { MAX_MEMO_BYTES, getMemoByteLength } from './memo';

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

// Invoice creation schema
export const createInvoiceSchema = z.object({
  amount: z.number().positive().max(1000000000),
  assetCode: z.string().default('XLM').optional(),
  assetIssuer: stellarPublicKeySchema.optional(),
  description: z.string().max(500).optional(),
  customerName: z.string().max(255).optional(),
  customerEmail: z.string().email().optional(),
  sellerName: z.string().max(255).optional(),
  sellerEmail: z.string().email().optional(),
  expiresInDays: z.number().min(1).max(365).default(7).optional(),
  sellerPublicKey: stellarPublicKeySchema, // Dinamik seller!
  memo: memoByteLengthSchema.optional(),
});
export const createInvoiceSchema = z
  .object({
    // The same stroop-based helper the verify path uses: never accept a
    // decimal that cannot be represented exactly on Stellar.
    amount: z
      .number()
      .positive()
      .max(1000000000)
      .refine(isValidAmount, {
        message: 'Amount must be a valid Stellar amount with at most 7 decimal places',
      }),
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

