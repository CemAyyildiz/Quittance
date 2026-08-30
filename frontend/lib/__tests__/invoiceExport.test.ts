import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadInvoiceCSV, generateInvoiceCSV } from '../export';

const paidInvoice = {
  id: 'inv-123',
  amount: 125.5,
  assetCode: 'USDC',
  status: 'PAID',
  memo: 'Consulting, July',
  createdAt: '2026-07-01T10:15:30',
  expiresAt: '2026-07-31T10:15:30',
  paidAt: '2026-07-02T09:05:04',
  sellerPublicKey: 'GSELLER',
  paymentTxHash: 'abc123',
};

const HEADERS =
  'Invoice ID,Created At,Seller Name,Seller Email,Customer Name,Customer Email,Description,Amount,Asset,Status,Paid At,Payer Name,Payer Email,Expires At,Memo,Transaction Hash';

describe('generateInvoiceCSV', () => {
  it('exports the stable invoice columns in order', () => {
    expect(generateInvoiceCSV([paidInvoice])).toBe(
      [
        HEADERS,
        'inv-123,2026-07-01 10:15:30,,,,,,125.5,USDC,PAID,2026-07-02 09:05:04,,,2026-07-31 10:15:30,"Consulting, July",abc123',
      ].join('\n'),
    );
  });

  it('omits transaction hashes from unpaid invoices', () => {
    const csv = generateInvoiceCSV([
      {
        ...paidInvoice,
        status: 'PENDING',
        paidAt: undefined,
      },
    ]);

    expect(csv.split('\n')[1]).toBe(
      'inv-123,2026-07-01 10:15:30,,,,,,125.5,USDC,PENDING,,,,2026-07-31 10:15:30,"Consulting, July",',
    );
  });

  it('returns the stable headers for an empty invoice list', () => {
    expect(generateInvoiceCSV([])).toBe(HEADERS);
  });
});

describe('downloadInvoiceCSV', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('uses an English, date-stamped default filename', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 27, 12, 34, 56));

    const link = {
      click: vi.fn(),
      setAttribute: vi.fn(),
      style: { visibility: '' },
    };
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:invoice-csv');
    const revokeObjectURL = vi.fn();

    vi.stubGlobal('document', {
      createElement: vi.fn(() => link),
      body: { appendChild, removeChild },
    });
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    downloadInvoiceCSV([paidInvoice]);

    expect(link.setAttribute).toHaveBeenCalledWith('href', 'blob:invoice-csv');
    expect(link.setAttribute).toHaveBeenCalledWith(
      'download',
      'quittance-invoices-2026-07-27-123456.csv',
    );
    expect(link.click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:invoice-csv');
  });
});
