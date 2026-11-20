import { customAlphabet } from 'nanoid';

// Restrict generated IDs to the same A-Z0-9 alphabet `isValidMemo` accepts.
// The default nanoid alphabet contains `-` and `_`, which made generated memos
// intermittently fail validation when a random dash landed in the suffix.
const alphanumeric = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);
const shortReference = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);

/**
 * Generate a unique memo for invoice
 * Format: INV-TIMESTAMP-RANDOM
 */
export const generateInvoiceMemo = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = alphanumeric();
  return `INV-${timestamp}-${random}`;
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

