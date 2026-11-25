import { describe, it, expect } from 'vitest';
import { remainingInvoiceAmount } from '../verify-invoice-payment';

describe('remainingInvoiceAmount', () => {
  it('returns the full amount when nothing has been verified against the invoice', () => {
    expect(remainingInvoiceAmount(12.5, '0')).toBe('12.5');
    expect(remainingInvoiceAmount('12.5000000', undefined)).toBe('12.5');
    expect(remainingInvoiceAmount(100, null)).toBe('100');
  });

  it('subtracts the verified matching payments from the total', () => {
    // 12.5 total, 5 already verified => 7.5 still unpaid.
    expect(remainingInvoiceAmount('12.5', '5')).toBe('7.5');
    expect(remainingInvoiceAmount('100.0000000', '0.5000000')).toBe('99.5');
  });

  it('returns zero for a settled invoice', () => {
    expect(remainingInvoiceAmount('12.5', '12.5')).toBe('0');
    expect(remainingInvoiceAmount('12.5', '12.5000000')).toBe('0');
  });

  it('never returns a negative remainder', () => {
    expect(remainingInvoiceAmount('12.5', '20')).toBe('0');
    expect(remainingInvoiceAmount('12.5', '12.5000001')).toBe('0');
  });

  it('ignores a blank or non-positive received amount', () => {
    expect(remainingInvoiceAmount('12.5', '')).toBe('12.5');
    expect(remainingInvoiceAmount('12.5', '   ')).toBe('12.5');
    expect(remainingInvoiceAmount('12.5', '-5')).toBe('12.5');
  });
});
