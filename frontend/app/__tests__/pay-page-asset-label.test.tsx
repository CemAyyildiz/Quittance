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
const ASSET_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const PAYMENT_URL = 'https://app.quittance.test/pay/inv_1';

// Invoice fixtures mirror the shape returned by the invoices API.
const nativeXlmInvoice = {
  id: 'inv_1',
  sellerPublicKey: DESTINATION,
  amount: '12.5',
  assetCode: 'XLM',
  memo: 'INV-1',
  status: 'PENDING',
  paymentTxHash: null,
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
};

const creditAssetInvoice = {
  ...nativeXlmInvoice,
  amount: '42.25',
  // Deliberately not USDC: the page must show the stored code, not an alias.
  assetCode: 'EURC',
  assetIssuer: ASSET_ISSUER,
};

function mockInvoice(invoice: typeof nativeXlmInvoice) {
  vi.mocked(invoiceApi.getById).mockResolvedValue({ data: invoice } as never);
  vi.mocked(invoiceApi.getPaymentInfo).mockResolvedValue({
    data: { paymentUrl: PAYMENT_URL },
  } as never);
}

describe('PaymentPage amount and asset label', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('labels a native XLM amount with XLM and no credit-asset note', async () => {
    mockInvoice(nativeXlmInvoice);
    render(<PaymentPage />);

    const amount = await screen.findByLabelText('12.5 XLM');

    expect(amount).toHaveTextContent('12.5');
    expect(amount).toHaveTextContent('XLM');
    expect(amount.parentElement).not.toHaveTextContent(/not native XLM/i);
  });

  it('shows the stored asset code beside the amount and marks it as not native XLM', async () => {
    mockInvoice(creditAssetInvoice);
    render(<PaymentPage />);

    const amount = await screen.findByLabelText('42.25 EURC');

    expect(amount).toHaveTextContent('EURC');
    expect(amount.parentElement).toHaveTextContent(/not native XLM/i);
    expect(amount.parentElement).not.toHaveTextContent('USDC');
  });
});
