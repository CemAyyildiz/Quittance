import { customAlphabet, nanoid } from 'nanoid';

export const MAX_MEMO_BYTES = 28;

// nanoid's default alphabet includes '-' and '_', which would break the
// INV-<timestamp>-<random> format, so keep the random segment alphanumeric.
const randomMemoSegment = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

/**
 * Generate a unique memo for invoice
 * Format: INV-TIMESTAMP-RANDOM
 * ASCII only and well under 28 bytes, so it always fits a Stellar text memo.
 */
export const generateInvoiceMemo = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase().slice(0, 6);
  return `INV-${timestamp}-${randomMemoSegment()}`;
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
  return shortReference();
};

export default {
  generateInvoiceMemo,
  isValidMemo,
  generateShortReference,
};
