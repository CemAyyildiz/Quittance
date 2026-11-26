import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PaymentPage from '../pay/[id]/page';
import { invoiceApi } from '@/lib/api';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'inv_1' }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn() },
}));

vi.mock('@/lib/api', () => ({
  invoiceApi: {
    getById: vi.fn(),
    getPaymentInfo: vi.fn(),
    verify: vi.fn(),
  },
}));

vi.mock('@/lib/export', () => ({
  openInvoicePDF: vi.fn(),
  shareInvoiceByEmail: vi.fn(),
}));

vi.mock('@/lib/stellarToml', () => ({
  loadAssetIssuerDomain: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/components/WalletConnect', () => ({ default: () => null }));
vi.mock('@/components/UserProfile', () => ({ default: () => null }));
vi.mock('@/components/PaymentButton', () => ({ default: () => null }));
vi.mock('@/components/PaymentReceipt', () => ({ default: () => null }));
vi.mock('@/components/PaymentQrCodes', () => ({ default: () => null }));

const DESTINATION = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKL';
const PAYMENT_URL = 'https://app.quittance.test/pay/inv_1';

const MATCHED_HASH = 'a'.repeat(64);
const SECOND_MATCHED_HASH = 'b'.repeat(64);
// A transaction that never matched the invoice must not appear in the list.
const UNMATCHED_HASH = 'f'.repeat(64);

// Invoice fixtures mirror the DTO: `payments` holds only verified payments,
// each identified by its full Stellar transaction hash.
const partiallyPaidInvoice = {
  id: 'inv_1',
  sellerPublicKey: DESTINATION,
  amount: '12.5',
  assetCode: 'XLM',
  memo: 'INV-1',
  status: 'PENDING',
  paymentTxHash: null,
  receivedAmount: '7.5',
  remainingAmount: '5',
  payments: [
    {
      txHash: MATCHED_HASH,
      amount: '5',
      payerPublicKey: DESTINATION,
      ledger: 100,
      paidAt: '2026-11-01T10:00:00.000Z',
    },
    {
      txHash: SECOND_MATCHED_HASH,
      amount: '2.5',
      payerPublicKey: DESTINATION,
      ledger: 101,
      paidAt: '2026-11-02T10:00:00.000Z',
    },
  ],
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
};

const unpaidInvoice = {
  ...partiallyPaidInvoice,
  receivedAmount: '0',
  remainingAmount: '12.5',
  payments: [],
};

function mockInvoice(invoice: typeof partiallyPaidInvoice) {
  vi.mocked(invoiceApi.getById).mockResolvedValue({ data: invoice } as never);
  vi.mocked(invoiceApi.getPaymentInfo).mockResolvedValue({
    data: { paymentUrl: PAYMENT_URL },
  } as never);
}

describe('PaymentPage matched payment hashes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists the full transaction hash of every matched payment', async () => {
    mockInvoice(partiallyPaidInvoice);
    render(<PaymentPage />);

    const list = await screen.findByRole('list', {
      name: 'Matched payment transaction hashes',
    });

    expect(list).toHaveTextContent(MATCHED_HASH);
    expect(list).toHaveTextContent(SECOND_MATCHED_HASH);
    expect(screen.getAllByText(/^[0-9a-f]{64}$/)).toHaveLength(2);
  });

  it('does not shorten the hashes it shows', async () => {
    mockInvoice(partiallyPaidInvoice);
    render(<PaymentPage />);

    const hash = await screen.findByText(MATCHED_HASH);
    expect(hash.textContent).toBe(MATCHED_HASH);
    expect(hash.textContent).toHaveLength(64);
    expect(hash.textContent).not.toContain('…');
  });

  it('omits a payment that never matched the invoice', async () => {
    mockInvoice(partiallyPaidInvoice);
    render(<PaymentPage />);

    await screen.findByText(MATCHED_HASH);
    expect(screen.queryByText(UNMATCHED_HASH)).not.toBeInTheDocument();
  });

  it('shows an empty list rather than an error when nothing has been paid', async () => {
    mockInvoice(unpaidInvoice);
    render(<PaymentPage />);

    expect(
      await screen.findByText(/no payments have matched this invoice yet/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Matched payment transaction hashes' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
