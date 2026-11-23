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
vi.mock('@/components/PaymentButton', () => ({ default: () => null }));
vi.mock('@/components/PaymentReceipt', () => ({ default: () => null }));

// The QR rendering itself is covered by PaymentQrCodes tests; surface the
// payloads here so we can assert what the page hands to the QR sections.
vi.mock('@/components/PaymentQrCodes', () => ({
  default: ({ paymentUrl, stellarPaymentUri }: { paymentUrl: string; stellarPaymentUri: string }) => (
    <div data-testid="qr-codes">
      {paymentUrl}|{stellarPaymentUri}
    </div>
  ),
}));

const DESTINATION = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKL';
const USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const PAYMENT_URL = 'https://app.quittance.test/pay/inv_1';

const baseInvoice = {
  id: 'inv_1',
  sellerPublicKey: DESTINATION,
  amount: 12.5,
  assetCode: 'XLM',
  memo: 'thanks & coffee',
  status: 'PENDING',
  paymentTxHash: null,
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
};

const mockInvoice = (overrides: Record<string, unknown>) => {
  vi.mocked(invoiceApi.getById).mockResolvedValue({
    data: { ...baseInvoice, ...overrides },
  } as never);
  // No stellarPaymentUri from the API: the page must build it from the invoice.
  vi.mocked(invoiceApi.getPaymentInfo).mockResolvedValue({
    data: { paymentUrl: PAYMENT_URL },
  } as never);
};

describe('PaymentPage SEP-7 handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an XLM SEP-7 URI with destination, amount, memo and memo type only', async () => {
    mockInvoice({});
    render(<PaymentPage />);

    const openControl = await screen.findByRole('link', {
      name: /open sep-7 payment uri/i,
    });

    expect(openControl).toHaveAttribute(
      'href',
      `web+stellar:pay?destination=${DESTINATION}&amount=12.5&memo=thanks%20%26%20coffee&memo_type=MEMO_TEXT`,
    );
    expect(openControl.getAttribute('href')).not.toContain('asset_code');
    expect(openControl.getAttribute('href')).not.toContain('asset_issuer');
  });

  it('shows the SEP-7 URI text for this invoice', async () => {
    mockInvoice({});
    render(<PaymentPage />);

    expect(
      await screen.findByText(
        `web+stellar:pay?destination=${DESTINATION}&amount=12.5&memo=thanks%20%26%20coffee&memo_type=MEMO_TEXT`,
      ),
    ).toBeInTheDocument();
  });

  it('includes asset code and issuer for a credit asset such as USDC', async () => {
    mockInvoice({ assetCode: 'USDC', assetIssuer: USDC_ISSUER, memo: 'INV 42' });
    render(<PaymentPage />);

    const openControl = await screen.findByRole('link', {
      name: /open sep-7 payment uri/i,
    });

    expect(openControl).toHaveAttribute(
      'href',
      `web+stellar:pay?destination=${DESTINATION}&amount=12.5&asset_code=USDC&asset_issuer=${USDC_ISSUER}&memo=INV%2042&memo_type=MEMO_TEXT`,
    );
  });

  it('keeps the web payment link for payers without a wallet handler', async () => {
    mockInvoice({});
    render(<PaymentPage />);

    const webLink = await screen.findByRole('link', {
      name: /use the web payment link/i,
    });
    expect(webLink).toHaveAttribute('href', PAYMENT_URL);

    // The payment URL is still handed to the QR section alongside the SEP-7 URI.
    expect(await screen.findByTestId('qr-codes')).toHaveTextContent(PAYMENT_URL);
  });
});
