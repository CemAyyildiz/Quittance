import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import InvoiceDetailPage from '../invoice/[id]/page';
import { invoiceApi } from '@/lib/api';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'inv_1' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn() },
}));

vi.mock('@/lib/api', () => ({
  invoiceApi: {
    getById: vi.fn(),
    getPaymentInfo: vi.fn(),
  },
}));

vi.mock('@/lib/export', () => ({ openInvoicePDF: vi.fn() }));
vi.mock('@/lib/anchor', () => ({ submitAnchorTransaction: vi.fn() }));
vi.mock('@/components/WalletConnect', () => ({ default: () => null }));
vi.mock('@/components/UserProfile', () => ({ default: () => null }));
vi.mock('@/components/PaymentReceipt', () => ({ default: () => null }));
vi.mock('@/components/PaymentQrCodes', () => ({ default: () => null }));
vi.mock('@/components/PaymentStatus', () => ({ default: () => null }));
vi.mock('@/components/StatusHistory', () => ({ default: () => null }));

const baseInvoice = {
  id: 'inv_1',
  sellerPublicKey: 'GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V',
  amount: 12.5,
  assetCode: 'XLM',
  memo: 'INV-1',
  status: 'PENDING',
  paymentTxHash: null,
  createdAt: '2024-06-15T12:34:56.000Z',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
};

function mockInvoice(overrides: Record<string, unknown> = {}) {
  vi.mocked(invoiceApi.getById).mockResolvedValue({
    data: { ...baseInvoice, ...overrides },
  } as never);
  vi.mocked(invoiceApi.getPaymentInfo).mockResolvedValue({
    data: { paymentUrl: 'https://app.quittance.test/pay/inv_1' },
  } as never);
}

describe('InvoiceDetailPage UTC timestamps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the created time in UTC and omits paid time for a pending invoice', async () => {
    mockInvoice();
    render(<InvoiceDetailPage />);

    expect(await screen.findByText('Created (UTC)')).toBeInTheDocument();
    expect(screen.getByTestId('invoice-created-utc')).toHaveTextContent('2024-06-15 12:34 UTC');
    expect(screen.queryByText('Paid (UTC)')).not.toBeInTheDocument();
    expect(screen.queryByTestId('invoice-paid-utc')).not.toBeInTheDocument();
  });

  it('shows the paid time in UTC exactly once for a paid invoice', async () => {
    mockInvoice({
      status: 'PAID',
      paidAt: '2024-06-16T09:05:00.000Z',
      paymentTxHash: 'a'.repeat(64),
    });
    render(<InvoiceDetailPage />);

    expect(await screen.findByText('Paid (UTC)')).toBeInTheDocument();
    const paid = screen.getAllByTestId('invoice-paid-utc');
    expect(paid).toHaveLength(1);
    expect(paid[0]).toHaveTextContent('2024-06-16 09:05 UTC');
  });

  it('shows an unparsable created time as unavailable', async () => {
    mockInvoice({ createdAt: 'garbage' });
    render(<InvoiceDetailPage />);

    await screen.findByText('Created (UTC)');
    expect(screen.getByTestId('invoice-created-utc')).toHaveTextContent('Unavailable');
  });
});
