import { z } from 'zod';
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
  amount: z.number().finite().positive().max(1000000000),
  assetCode: z.string().default('XLM').optional(),
  assetIssuer: z.string().optional(),
  description: z.string().max(500).optional(),
  customerName: z.string().max(255).optional(),
  customerEmail: z.string().email().optional(),
  sellerName: z.string().max(255).optional(),
  sellerEmail: z.string().email().optional(),
  expiresInDays: z.number().min(1).max(365).default(7).optional(),
  sellerPublicKey: stellarPublicKeySchema,
  memo: memoByteLengthSchema.optional(),
  lineItems: z.array(lineItemSchema).min(1).max(MAX_LINE_ITEMS).optional(),
}).superRefine((invoice, ctx) => {
  if (invoice.assetIssuer) {
    const issuerResult = stellarPublicKeySchema.safeParse(invoice.assetIssuer);
    if (!issuerResult.success) {
      ctx.addIssue({
        code: 'custom',
        path: ['assetIssuer'],
        message: 'Invalid Stellar public key format',
      });
    }
  }
  if (!invoice.lineItems) return;
  const lineTotal = sumLineItems(invoice.lineItems);
  const submittedTotal = roundStellarAmount(invoice.amount);
  if (lineTotal !== submittedTotal) {
    ctx.addIssue({
      code: 'custom',
      path: ['amount'],
      message: `Amount must equal the sum of line items (${lineTotal})`,
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

