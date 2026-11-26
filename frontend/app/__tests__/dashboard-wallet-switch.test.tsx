import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import DashboardPage from '../dashboard/page';
import { invoiceApi } from '@/lib/api';
import { useWalletStore } from '@/lib/store';

const FIRST_WALLET = 'GFIRSTWALLET';
const SECOND_WALLET = 'GSECONDWALLET';

vi.mock('@/lib/api', () => ({
  invoiceApi: {
    getAll: vi.fn(),
    getStats: vi.fn(),
    importInvoiceBackup: vi.fn(),
  },
}));

vi.mock('@/lib/store', () => ({
  useWalletStore: vi.fn(),
}));

vi.mock('@/lib/export', () => ({
  downloadAllInvoicesCSV: vi.fn(),
  downloadPaidInvoiceCSV: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/InvoiceCard', () => ({
  default: ({ invoice }: { invoice: { id: string } }) => (
    <div data-testid="invoice-row">{invoice.id}</div>
  ),
}));
vi.mock('@/components/WalletConnect', () => ({ default: () => null }));
vi.mock('@/components/UserProfile', () => ({ default: () => null }));
vi.mock('@/components/TransactionHistory', () => ({ default: () => null }));
vi.mock('@/components/NetworkBadge', () => ({ default: () => null }));
vi.mock('@/components/InvoiceBackupExport', () => ({ default: () => null }));

function invoice(id: string, sellerPublicKey: string) {
  return {
    id,
    status: 'PENDING',
    sellerPublicKey,
    amount: 1,
    assetCode: 'XLM',
    memo: id,
  };
}

function connectWallet(publicKey: string | null) {
  vi.mocked(useWalletStore).mockReturnValue({
    connected: publicKey !== null,
    publicKey,
  } as never);
}

afterEach(() => {
  cleanup();
});

describe('dashboard wallet switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invoiceApi.getStats).mockResolvedValue({ data: [{}] } as never);
    vi.mocked(invoiceApi.getAll).mockImplementation(async (params) => {
      const seller = params?.sellerPublicKey;
      if (seller === FIRST_WALLET) {
        return { data: [invoice('first-wallet-invoice', FIRST_WALLET)], pagination: {} } as never;
      }
      if (seller === SECOND_WALLET) {
        return { data: [invoice('second-wallet-invoice', SECOND_WALLET)], pagination: {} } as never;
      }
      return { data: [], pagination: {} } as never;
    });
  });

  it('removes the previous wallet invoice after Freighter switches accounts', async () => {
    connectWallet(FIRST_WALLET);
    const view = render(<DashboardPage />);

    expect(await screen.findByText('first-wallet-invoice')).toBeInTheDocument();

    connectWallet(SECOND_WALLET);
    view.rerender(<DashboardPage />);

    expect(await screen.findByText('second-wallet-invoice')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText('first-wallet-invoice')).not.toBeInTheDocument(),
    );
  });

  it('clears the list when the wallet disconnects', async () => {
    connectWallet(FIRST_WALLET);
    const view = render(<DashboardPage />);

    expect(await screen.findByText('first-wallet-invoice')).toBeInTheDocument();

    connectWallet(null);
    view.rerender(<DashboardPage />);

    await waitFor(() =>
      expect(screen.queryByText('first-wallet-invoice')).not.toBeInTheDocument(),
    );
  });
});
