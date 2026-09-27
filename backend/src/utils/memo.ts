import { customAlphabet, nanoid } from 'nanoid';

// `nanoid` default alphabet includes '-' and '_', which break the
// INV-TIMESTAMP-RANDOM memo format. Restrict the random segment to A-Z0-9.
const MEMO_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const generateMemoRandom = customAlphabet(MEMO_ALPHABET, 8);

/**
 * Generate a unique memo for invoice
 * Format: INV-TIMESTAMP-RANDOM
 */
export const generateInvoiceMemo = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = generateMemoRandom();
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
  return nanoid(10).toUpperCase();
};

export default {
  generateInvoiceMemo,
  isValidMemo,
  generateShortReference,
};

