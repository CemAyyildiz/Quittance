import { describe, expect, it } from 'vitest';
import { canCancel, isPaid, isPending, type InvoiceStatus } from '../invoice-status';

const statusCases: Array<{
  status: InvoiceStatus;
  canCancel: boolean;
  isPending: boolean;
  isPaid: boolean;
}> = [
  { status: 'PENDING', canCancel: true, isPending: true, isPaid: false },
  { status: 'PAID', canCancel: false, isPending: false, isPaid: true },
  { status: 'EXPIRED', canCancel: false, isPending: false, isPaid: false },
  { status: 'CANCELLED', canCancel: false, isPending: false, isPaid: false },
];

describe('invoice status helpers', () => {
  it.each(statusCases)('evaluates $status consistently', ({ status, canCancel: expectedCanCancel, isPending: expectedIsPending, isPaid: expectedIsPaid }) => {
    expect(canCancel(status)).toBe(expectedCanCancel);
    expect(isPending(status)).toBe(expectedIsPending);
    expect(isPaid(status)).toBe(expectedIsPaid);
  });
});