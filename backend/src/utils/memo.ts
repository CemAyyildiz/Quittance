import { nanoid } from 'nanoid';

const MAX_MEMO_BYTES = 28;

/**
 * Generate a unique memo for invoice
 * Format: INV-TIMESTAMP-RANDOM
 * Guaranteed to be 28 bytes or fewer (ASCII only).
 */
export const generateInvoiceMemo = (): string {
  const timestamp = Date.now().toString(36).toUpperCase().slice(0, 6);
  const random = nanoid(10).toUpperCase().slice(0, 10);
  const memo = `INV-${timestamp}-${random}`;
  return memo.length <= MAX_MEMO_BYTES ? memo : generateInvoiceMemo();
};

/**
 * Get the byte length of a memo (UTF-8)
 */
export const getMemoByteLength = (memo: string): number => {
  return Buffer.from(memo, 'utf8').length;
};

/**
 * Validate memo byte length
 */
export const validateMemoByteLength = (memo: string): { valid: boolean; error?: string } => {
  if (getMemoByteLength(memo) > MAX_MEMO_BYTES) {
    return {
      valid: false,
      error: `Memo exceeds maximum byte length of ${MAX_MEMO_BYTES} bytes.`,
    };
  }
  return { valid: true };
};

/**
 * Validate memo format
 */
export const isValidMemo = (memo: string): boolean => {
  return /^INV-[A-Z0-9]+-[A-Z0-9]+$/.test(memo);
};

/**
 * Generate short payment reference
 */
export const generateShortReference = (): string => {
  return nanoid(10).toUpperCase();
};

export default {
  generateInvoiceMemo,
  isValidMemo,
  generateShortReference,
};

