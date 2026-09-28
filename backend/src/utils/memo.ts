import { nanoid } from 'nanoid';

/**
 * Generate a unique memo for invoice
 * Format: INV-TIMESTAMP-RANDOM
 */
export const generateInvoiceMemo = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = nanoid(8).toUpperCase();
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

