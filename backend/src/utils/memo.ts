import { customAlphabet, nanoid } from 'nanoid';

const UPPER_ALPHANUMERIC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWSTEM';
const randomId = customAlphabet(UPPER_ALPHANUMERIC, 8);

/**
 * Generate a unique memo for invoice
 * Format: INV-TIMESTAMP-RANDOM
 * Timestamp is base36 uppercased, random uses only uppercase alphanumeric chars (no - or _).
 */
export const generateInvoiceMemo = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomId();
  return `INV-${timestamp}-${random}`;
};

/**
 * Validate memo format: INV-TIMESTAMP-RANDOM
 * Segments after INV- must contain only uppercase letters and digits.
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

