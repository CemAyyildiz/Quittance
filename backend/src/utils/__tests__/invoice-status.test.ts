import { describe, expect, it } from 'vitest';
import { canCancel, isCancelled, isExpired, isPaid, isPending, type InvoiceStatus } from '../invoice-status';

const statusCases: Array<{
  status: InvoiceStatus;
  canCancel: boolean;
  isExpired: boolean;
  isPending: boolean;
  isPaid: boolean;
  isCancelled: boolean;
}> = [
  { status: 'PENDING', canCancel: true, isExpired: false, isPending: true, isPaid: false, isCancelled: false },
  { status: 'PAID', canCancel: false, isExpired: false, isPending: false, isPaid: true, isCancelled: false },
  { status: 'EXPIRED', canCancel: false, isExpired: true, isPending: false, isPaid: false, isCancelled: false },
  { status: 'CANCELLED', canCancel: false, isExpired: false, isPending: false, isPaid: false, isCancelled: true },
];

describe('invoice status helpers', () => {
  it.each(statusCases)('evaluates $status consistently', ({ status, canCancel: expectedCanCancel, isExpired: expectedIsExpired, isPending: expectedIsPending, isPaid: expectedIsPaid, isCancelled: expectedIsCancelled }) => {
    expect(canCancel(status)).toBe(expectedCanCancel);
    expect(isExpired(status)).toBe(expectedIsExpired);
    expect(isPending(status)).toBe(expectedIsPending);
    expect(isPaid(status)).toBe(expectedIsPaid);
    expect(isCancelled(status)).toBe(expectedIsCancelled);
  });

  it('asserts isCancelled is true for CANCELLED and false otherwise', () => {
    expect(isCancelled('CANCELLED')).toBe(true);
    for (const status of ['PENDING', 'PAID', 'EXPIRED'] as const) {
      expect(isCancelled(status)).toBe(false);
    }
  });

  it('returns false for every helper on a lowercase pending status', () => {
    // Comparisons are exact, so a lowercase value is not a valid status.
    const lowercasePending = 'pending' as unknown as InvoiceStatus;

    expect(canCancel(lowercasePending)).toBe(false);
    expect(isPending(lowercasePending)).toBe(false);
    expect(isPaid(lowercasePending)).toBe(false);
    expect(isExpired(lowercasePending)).toBe(false);
    expect(isCancelled(lowercasePending)).toBe(false);
  });

  it('still treats uppercase PENDING as cancelable and pending', () => {
    expect(canCancel('PENDING')).toBe(true);
    expect(isPending('PENDING')).toBe(true);
  });
});