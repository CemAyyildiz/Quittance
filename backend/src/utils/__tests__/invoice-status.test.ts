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
});