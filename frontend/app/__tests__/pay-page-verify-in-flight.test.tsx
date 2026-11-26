import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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
// Surface the `disabled` prop the page hands to the wallet payment control.
vi.mock('@/components/PaymentButton', () => ({
  default: ({ disabled }: { disabled?: boolean }) => (
    <button type="button" data-testid="wallet-pay" disabled={disabled}>
      Pay with Freighter
    </button>
  ),
}));

const DESTINATION = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKL';
const PAYMENT_URL = 'https://app.quittance.test/pay/inv_1';
const TX_HASH = 'c'.repeat(64);

// Fixture for a pending invoice that can still be paid.
const invoiceFixture = {
  id: 'inv_1',
  sellerPublicKey: DESTINATION,
  amount: '12.5',
  assetCode: 'XLM',
  memo: 'INV-1',
  status: 'PENDING',
  paymentTxHash: null,
  receivedAmount: '0',
  remainingAmount: '12.5',
  payments: [],
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
};

function mockInvoice() {
  vi.mocked(invoiceApi.getById).mockResolvedValue({
    data: invoiceFixture,
  } as never);
  vi.mocked(invoiceApi.getPaymentInfo).mockResolvedValue({
    data: { paymentUrl: PAYMENT_URL },
  } as never);
}

describe('PaymentPage wallet control during manual verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables the wallet pay control while a pasted hash is being verified', async () => {
    mockInvoice();
    let rejectVerify: (reason?: unknown) => void = () => {};
    vi.mocked(invoiceApi.verify).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectVerify = reject;
        }) as never,
    );

    render(<PaymentPage />);

    const payControl = await screen.findByTestId('wallet-pay');
    expect(payControl).toBeEnabled();

    fireEvent.change(await screen.findByLabelText('Transaction hash'), {
      target: { value: TX_HASH },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify payment' }));

    await waitFor(() => expect(invoiceApi.verify).toHaveBeenCalledWith('inv_1', TX_HASH));
    expect(screen.getByTestId('wallet-pay')).toBeDisabled();

    // A failed verification must give the control back.
    await act(async () => {
      rejectVerify(new Error('verification unavailable'));
    });
    await waitFor(() => expect(screen.getByTestId('wallet-pay')).toBeEnabled());
  });
});
