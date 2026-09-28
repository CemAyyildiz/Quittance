import { z } from 'zod';

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
  amount: z.number().positive().max(1000000000),
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

