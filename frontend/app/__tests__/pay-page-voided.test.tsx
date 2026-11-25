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
  },
}));

vi.mock('@/lib/export', () => ({
  openInvoicePDF: vi.fn(),
  shareInvoiceByEmail: vi.fn(),
}));

vi.mock('@/components/WalletConnect', () => ({ default: () => null }));
vi.mock('@/components/UserProfile', () => ({ default: () => null }));
vi.mock('@/components/PaymentReceipt', () => ({ default: () => null }));
vi.mock('@/components/PaymentQrCodes', () => ({ default: () => null }));
// The real button talks to Freighter; a stand-in makes the pay action observable.
vi.mock('@/components/PaymentButton', () => ({
  default: () => <button type="button">Pay with Freighter</button>,
}));

const VOIDED_MESSAGE = /the seller voided this invoice, so it cannot be paid/i;

const baseInvoice = {
  id: 'inv_1',
  sellerPublicKey: 'GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V',
  amount: 12.5,
  assetCode: 'XLM',
  memo: 'INV-1',
  status: 'PENDING',
  paymentTxHash: null,
  createdAt: '2024-06-15T12:00:00.000Z',
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

describe('PaymentPage voided invoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('explains that the seller voided the invoice and offers no pay action', async () => {
    mockInvoice({ status: 'CANCELLED' });
    render(<PaymentPage />);

    expect(await screen.findByText(VOIDED_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Invoice Voided' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pay with freighter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /verify payment/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/pay manually from any wallet/i)).not.toBeInTheDocument();
  });

  it('leaves a pending invoice payable with no voided message', async () => {
    mockInvoice();
    render(<PaymentPage />);

    expect(await screen.findByRole('button', { name: /pay with freighter/i })).toBeInTheDocument();
    expect(screen.queryByText(VOIDED_MESSAGE)).not.toBeInTheDocument();
  });

  it('does not show the voided message for a paid invoice', async () => {
    mockInvoice({
      status: 'PAID',
      paidAt: '2024-06-16T09:30:00.000Z',
      paymentTxHash: 'a'.repeat(64),
    });
    render(<PaymentPage />);

    await screen.findAllByText('Paid');
    expect(screen.queryByText(VOIDED_MESSAGE)).not.toBeInTheDocument();
  });

  it('still says an unknown invoice was not found', async () => {
    vi.mocked(invoiceApi.getById).mockRejectedValue({ response: { status: 404 } });
    vi.mocked(invoiceApi.getPaymentInfo).mockRejectedValue({ response: { status: 404 } });
    render(<PaymentPage />);

    expect(await screen.findByText('Invoice Not Found')).toBeInTheDocument();
    expect(screen.queryByText(VOIDED_MESSAGE)).not.toBeInTheDocument();
  });
});
