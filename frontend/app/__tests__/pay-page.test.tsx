import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

vi.mock('@/components/WalletConnect', () => ({
  default: ({ onConnect }: { onConnect?: (publicKey: string) => void }) => (
    <button
      type="button"
      aria-label="connect-wallet"
      onClick={() => onConnect?.(DESTINATION)}
    >
      connect-wallet
    </button>
  ),
}));
vi.mock('@/components/UserProfile', () => ({ default: () => null }));
vi.mock('@/components/PaymentButton', () => ({
  default: () => <div data-testid="freighter-pay" />,
}));
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
const TX_HASH = 'c'.repeat(64);

const writeText = vi.fn();

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

  it('keeps an unavailable email action out of the accessibility tree and tab order', async () => {
    mockInvoice({ status: 'PAID', paidAt: '2026-11-23T12:00:00Z' });
    render(<PaymentPage />);
    expect(screen.queryByRole('button', { name: /email payment proof/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Download Proof' })).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: 'connect-wallet' }));
    expect(await screen.findByRole('button', { name: 'Download Proof' })).toBeEnabled();
  });

  it('gives the available email proof action an accessible name', async () => {
    mockInvoice({
      status: 'PAID',
      paidAt: '2026-11-23T12:00:00Z',
      customerEmail: 'client@example.com',
    });
    render(<PaymentPage />);
    expect(screen.queryByRole('button', { name: /email payment proof/i })).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: 'connect-wallet' }));
    expect(
      await screen.findByRole('button', { name: /email payment proof/i }),
    ).toBeEnabled();
  });

  it('shows paid status and removes the payment action for a paid invoice', async () => {
    mockInvoice({ status: 'PAID', paidAt: '2026-11-23T12:00:00Z' });
    render(<PaymentPage />);

    expect(await screen.findByText('Payment Completed')).toBeInTheDocument();
    expect(screen.queryByTestId('freighter-pay')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verify payment' })).not.toBeInTheDocument();
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

  it('uses the M address in the URI and manual payment instructions', async () => {
    const muxed = 'MSELLERADDRESS';
    mockInvoice({ sellerMuxedAddress: muxed });
    render(<PaymentPage />);

    const openControl = await screen.findByRole('link', {
      name: /open sep-7 payment uri/i,
    });
    expect(openControl.getAttribute('href')).toContain(`destination=${muxed}`);
    expect(screen.getByText(muxed)).toBeInTheDocument();
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

  it('shows the expired state on the page itself', async () => {
    mockInvoice({
      status: 'EXPIRED',
      expiresAt: new Date(Date.now() - 86_400_000).toISOString(),
    });
    render(<PaymentPage />);

    expect(await screen.findByText('Payment Expired')).toBeInTheDocument();
    expect(screen.queryByText(/expires in/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/waiting for payment/i)).not.toBeInTheDocument();
  });
});

describe('PaymentPage manual payment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  it('shows and copies destination, memo, amount, asset code, and issuer', async () => {
    mockInvoice({ assetCode: 'USDC', assetIssuer: USDC_ISSUER, memo: 'INV 42' });
    render(<PaymentPage />);

    const fields: Array<[string, string]> = [
      ['Copy destination', DESTINATION],
      ['Copy memo', 'INV 42'],
      ['Copy amount', '12.5'],
      ['Copy asset code', 'USDC'],
      ['Copy asset issuer', USDC_ISSUER],
    ];

    await screen.findByRole('button', { name: 'Copy destination' });

    for (const [buttonName, value] of fields) {
      fireEvent.click(screen.getByRole('button', { name: buttonName }));
      await waitFor(() => expect(writeText).toHaveBeenCalledWith(value));
    }

    expect(screen.getByText(USDC_ISSUER)).toBeInTheDocument();
  });

  it('hides the issuer row for a native XLM invoice', async () => {
    mockInvoice({});
    render(<PaymentPage />);

    await screen.findByRole('button', { name: 'Copy asset code' });
    expect(screen.queryByRole('button', { name: 'Copy asset issuer' })).not.toBeInTheDocument();
  });

  it.each([
    { code: 'MEMO_MISMATCH', field: /memo/i },
    { code: 'AMOUNT_MISMATCH', field: /amount/i },
    { code: 'DESTINATION_MISMATCH', field: /destination/i },
    { code: 'ASSET_MISMATCH', field: /asset/i },
  ])('names the failed field for $code', async ({ code, field }) => {
    mockInvoice({});
    vi.mocked(invoiceApi.verify).mockRejectedValue({
      response: { data: { code, error: 'mismatch' } },
    });
    render(<PaymentPage />);

    fireEvent.change(await screen.findByLabelText('Transaction hash'), {
      target: { value: TX_HASH },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify payment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(field);
    expect(invoiceApi.verify).toHaveBeenCalledWith('inv_1', TX_HASH);
  });

  it('submits a pasted hash to the existing verify endpoint', async () => {
    mockInvoice({});
    vi.mocked(invoiceApi.verify).mockResolvedValue({ data: { status: 'PAID' } } as never);
    render(<PaymentPage />);

    fireEvent.change(await screen.findByLabelText('Transaction hash'), {
      target: { value: TX_HASH },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify payment' }));

    await waitFor(() => expect(invoiceApi.verify).toHaveBeenCalledWith('inv_1', TX_HASH));
  });

  it('rejects a short hash without calling the API', async () => {
    mockInvoice({});
    render(<PaymentPage />);

    fireEvent.change(await screen.findByLabelText('Transaction hash'), {
      target: { value: 'abc123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify payment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/64-character hexadecimal/i);
    expect(invoiceApi.verify).not.toHaveBeenCalled();
  });

  it('keeps the Freighter pay control on the page', async () => {
    mockInvoice({});
    render(<PaymentPage />);

    expect(await screen.findByTestId('freighter-pay')).toBeInTheDocument();
  });

  it('keeps the Freighter pay control available when verification fails', async () => {
    mockInvoice({});
    vi.mocked(invoiceApi.verify).mockRejectedValue(new Error('Verification unavailable'));
    render(<PaymentPage />);

    fireEvent.change(await screen.findByLabelText('Transaction hash'), {
      target: { value: TX_HASH },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify payment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /could not verify this transaction/i,
    );
    expect(screen.getByTestId('freighter-pay')).toBeInTheDocument();
  });
});
