import { describe, expect, it } from 'vitest';
import { canCancel, isExpired, isPaid, isPending, type InvoiceStatus } from '../invoice-status';

const statusCases: Array<{
  status: InvoiceStatus;
  canCancel: boolean;
  isExpired: boolean;
  isPending: boolean;
  isPaid: boolean;
}> = [
  { status: 'PENDING', canCancel: true, isExpired: false, isPending: true, isPaid: false },
  { status: 'PAID', canCancel: false, isExpired: false, isPending: false, isPaid: true },
  { status: 'EXPIRED', canCancel: false, isExpired: true, isPending: false, isPaid: false },
  { status: 'CANCELLED', canCancel: false, isExpired: false, isPending: false, isPaid: false },
];

describe('invoice status helpers', () => {
  it.each(statusCases)('evaluates $status consistently', ({ status, canCancel: expectedCanCancel, isExpired: expectedIsExpired, isPending: expectedIsPending, isPaid: expectedIsPaid }) => {
    expect(canCancel(status)).toBe(expectedCanCancel);
    expect(isExpired(status)).toBe(expectedIsExpired);
    expect(isPending(status)).toBe(expectedIsPending);
    expect(isPaid(status)).toBe(expectedIsPaid);
  });
});