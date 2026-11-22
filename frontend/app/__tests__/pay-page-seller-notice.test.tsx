import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PaymentPage from '../pay/[id]/page';
import { invoiceApi } from '@/lib/api';

const SELLER = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKL';
const OTHER_SELLER = 'GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V';
const PAYMENT_URL = 'https://app.quittance.test/pay/inv_1';

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

// WalletConnect normally talks to the Freighter extension; a button stands in
// for it so a test can connect the seller's wallet.
vi.mock('@/components/WalletConnect', () => ({
  default: ({ onConnect }: { onConnect?: (publicKey: string) => void }) => (
    <button type="button" onClick={() => onConnect?.('GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKL')}>
      connect-wallet
    </button>
  ),
}));

vi.mock('@/components/UserProfile', () => ({ default: () => null }));
vi.mock('@/components/PaymentButton', () => ({ default: () => null }));
vi.mock('@/components/PaymentReceipt', () => ({ default: () => null }));
vi.mock('@/components/PaymentQrCodes', () => ({ default: () => null }));

const baseInvoice = {
  id: 'inv_1',
  sellerPublicKey: SELLER,
  amount: 12.5,
  assetCode: 'XLM',
  memo: 'INV-1',
  status: 'PENDING',
  paymentTxHash: null,
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
};

function mockInvoice(overrides: Record<string, unknown> = {}) {
  vi.mocked(invoiceApi.getById).mockResolvedValue({
    data: { ...baseInvoice, ...overrides },
  } as never);
  vi.mocked(invoiceApi.getPaymentInfo).mockResolvedValue({
    data: { paymentUrl: PAYMENT_URL },
  } as never);
}

describe('PaymentPage seller self-payment notice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tells a connected seller they cannot settle their own invoice', async () => {
    mockInvoice();
    render(<PaymentPage />);

    const connectButtons = await screen.findAllByRole('button', {
      name: 'connect-wallet',
    });
    fireEvent.click(connectButtons[0]);

    expect(
      await screen.findByText(/the seller cannot settle their own invoice/i),
    ).toBeInTheDocument();
  });

  it('shows no self-payment notice for a different connected wallet', async () => {
    mockInvoice({ sellerPublicKey: OTHER_SELLER });
    render(<PaymentPage />);

    const connectButtons = await screen.findAllByRole('button', {
      name: 'connect-wallet',
    });
    fireEvent.click(connectButtons[0]);

    expect(
      screen.queryByText(/the seller cannot settle their own invoice/i),
    ).not.toBeInTheDocument();
  });
});
