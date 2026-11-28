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
vi.mock('@/components/PaymentReceipt', () => ({ default: () => null }));
vi.mock('@/components/PaymentQrCodes', () => ({ default: () => null }));
// Surface the amount handed to the wallet so the test can compare it with the
// amount rendered on the page.
vi.mock('@/components/PaymentButton', () => ({
  default: ({ amount }: { amount: string }) => <div data-testid="wallet-payment">{amount}</div>,
}));

const DESTINATION = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKL';
const PAYMENT_URL = 'https://app.quittance.test/pay/inv_1';

// Fixtures mirror the invoice DTO: `amount` is the total, `receivedAmount` the
// sum of verified matching payments, and `remainingAmount` their difference.
const partialInvoice = {
  id: 'inv_1',
  sellerPublicKey: DESTINATION,
  amount: '12.5',
  assetCode: 'XLM',
  memo: 'INV-1',
  status: 'PENDING',
  paymentTxHash: null,
  receivedAmount: '5',
  remainingAmount: '7.5',
  payments: [{ txHash: 'a'.repeat(64), amount: '5', payerPublicKey: DESTINATION }],
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
};

const unpaidInvoice = {
  ...partialInvoice,
  receivedAmount: '0',
  remainingAmount: '12.5',
  payments: [],
};

function mockInvoice(invoice: typeof partialInvoice) {
  vi.mocked(invoiceApi.getById).mockResolvedValue({ data: invoice } as never);
  vi.mocked(invoiceApi.getPaymentInfo).mockResolvedValue({
    data: { paymentUrl: PAYMENT_URL },
  } as never);
}

describe('PaymentPage remaining amount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows only the unpaid remainder on a partially paid invoice', async () => {
    mockInvoice(partialInvoice);
    render(<PaymentPage />);

    expect(await screen.findByText('7.5000000')).toBeInTheDocument();
    expect(screen.queryByText('12.5000000')).not.toBeInTheDocument();
  });

  it('keeps the invoice total and the paid part visible for context', async () => {
    mockInvoice(partialInvoice);
    render(<PaymentPage />);

    await screen.findByText('7.5000000');
    expect(screen.getByText(/12\.5 XLM total/i)).toBeInTheDocument();
    expect(screen.getByText(/5 XLM already paid/i)).toBeInTheDocument();
  });

  it('asks the wallet for the remainder rather than the total', async () => {
    mockInvoice(partialInvoice);
    render(<PaymentPage />);

    expect(await screen.findByTestId('wallet-payment')).toHaveTextContent('7.5');
  });

  it('never shows a negative remainder', async () => {
    mockInvoice({ ...partialInvoice, receivedAmount: '20', remainingAmount: '-7.5' });
    render(<PaymentPage />);

    expect(await screen.findByText('0.0000000')).toBeInTheDocument();
  });

  it('shows the full amount when nothing matching has been paid', async () => {
    mockInvoice(unpaidInvoice);
    render(<PaymentPage />);

    expect(await screen.findByText('12.5000000')).toBeInTheDocument();
    expect(screen.queryByText(/total/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('wallet-payment')).toHaveTextContent('12.5');
  });
});
