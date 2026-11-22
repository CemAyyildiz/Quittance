import { customAlphabet } from "nanoid";

const memoRandom = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 8);
const shortReferenceRandom = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 10);

/**
 * Generate a unique memo for invoice
 * Format: INV-TIMESTAMP-RANDOM
 */
export const generateInvoiceMemo = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = memoRandom();
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
  return shortReferenceRandom();
};

export default {
  generateInvoiceMemo,
  isValidMemo,
  generateShortReference,
};
