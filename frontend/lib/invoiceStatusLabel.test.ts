import { describe, it, expect } from 'vitest';
import {
  invoiceStatusLabel,
  invoiceStatusLabelSafe,
  isKnownInvoiceStatus,
} from './invoiceStatusLabel';

// ---------------------------------------------------------------------------
// invoiceStatusLabel — happy path
// ---------------------------------------------------------------------------

describe('invoiceStatusLabel — happy path', () => {
  it('returns "Pending" for PENDING status', () => {
    expect(invoiceStatusLabel('PENDING')).toBe('Pending');
  });

  it('returns "Paid" for PAID status', () => {
    expect(invoiceStatusLabel('PAID')).toBe('Paid');
  });

  it('returns "Expired" for EXPIRED status', () => {
    expect(invoiceStatusLabel('EXPIRED')).toBe('Expired');
  });

  it('returns "Cancelled" for CANCELLED status', () => {
    expect(invoiceStatusLabel('CANCELLED')).toBe('Cancelled');
  });
});

// ---------------------------------------------------------------------------
// invoiceStatusLabel — case insensitivity & whitespace
// ---------------------------------------------------------------------------

describe('invoiceStatusLabel — case insensitivity & whitespace', () => {
  it('accepts lower-case input', () => {
    expect(invoiceStatusLabel('pending')).toBe('Pending');
    expect(invoiceStatusLabel('paid')).toBe('Paid');
  });

  it('accepts mixed-case input', () => {
    expect(invoiceStatusLabel('Pending')).toBe('Pending');
    expect(invoiceStatusLabel('Expired')).toBe('Expired');
  });

  it('trims surrounding whitespace', () => {
    expect(invoiceStatusLabel('  PENDING  ')).toBe('Pending');
    expect(invoiceStatusLabel('\tPAID\n')).toBe('Paid');
  });
});

// ---------------------------------------------------------------------------
// invoiceStatusLabel — invalid / edge-case inputs
// ---------------------------------------------------------------------------

describe('invoiceStatusLabel — invalid / edge-case inputs', () => {
  it('returns "Unknown" for an unrecognised code', () => {
    expect(invoiceStatusLabel('UNKNOWN')).toBe('Unknown');
    expect(invoiceStatusLabel('IN_PROGRESS')).toBe('Unknown');
    expect(invoiceStatusLabel('REFUNDED')).toBe('Unknown');
  });

  it('returns "Unknown" for empty string', () => {
    expect(invoiceStatusLabel('')).toBe('Unknown');
  });

  it('returns "Unknown" for whitespace-only string', () => {
    expect(invoiceStatusLabel('   ')).toBe('Unknown');
  });

  it('returns "Unknown" for null', () => {
    expect(invoiceStatusLabel(null)).toBe('Unknown');
  });

  it('returns "Unknown" for undefined', () => {
    expect(invoiceStatusLabel(undefined)).toBe('Unknown');
  });

  it('returns "Unknown" for non-string types', () => {
    expect(invoiceStatusLabel(42 as unknown)).toBe('Unknown');
    expect(invoiceStatusLabel({} as unknown)).toBe('Unknown');
    expect(invoiceStatusLabel([] as unknown)).toBe('Unknown');
    expect(invoiceStatusLabel(true as unknown)).toBe('Unknown');
  });
});

// ---------------------------------------------------------------------------
// invoiceStatusLabelSafe — type-safe variant
// ---------------------------------------------------------------------------

describe('invoiceStatusLabelSafe — type-safe variant', () => {
  it('returns correct labels for all canonical statuses', () => {
    expect(invoiceStatusLabelSafe('PENDING')).toBe('Pending');
    expect(invoiceStatusLabelSafe('PAID')).toBe('Paid');
    expect(invoiceStatusLabelSafe('EXPIRED')).toBe('Expired');
    expect(invoiceStatusLabelSafe('CANCELLED')).toBe('Cancelled');
  });
});


// ---------------------------------------------------------------------------
// US spelling alias + isKnownInvoiceStatus
// ---------------------------------------------------------------------------

describe('invoiceStatusLabel — US spelling alias', () => {
  it('maps canceled (US) to Cancelled', () => {
    expect(invoiceStatusLabel('canceled')).toBe('Cancelled');
    expect(invoiceStatusLabel('CANCELED')).toBe('Cancelled');
    expect(invoiceStatusLabel('  Canceled  ')).toBe('Cancelled');
  });
});

describe('isKnownInvoiceStatus', () => {
  it('returns true for canonical statuses and US alias', () => {
    expect(isKnownInvoiceStatus('PENDING')).toBe(true);
    expect(isKnownInvoiceStatus('paid')).toBe(true);
    expect(isKnownInvoiceStatus('CANCELED')).toBe(true);
    expect(isKnownInvoiceStatus('cancelled')).toBe(true);
  });

  it('returns false for unknown or invalid inputs', () => {
    expect(isKnownInvoiceStatus('REFUNDED')).toBe(false);
    expect(isKnownInvoiceStatus('')).toBe(false);
    expect(isKnownInvoiceStatus(null)).toBe(false);
    expect(isKnownInvoiceStatus(undefined)).toBe(false);
  });
});
