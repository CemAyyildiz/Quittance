import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import DashboardPage from '../dashboard/page';
import { invoiceApi } from '@/lib/api';
import { useWalletStore } from '@/lib/store';
import { downloadAllInvoicesCSV, downloadPaidInvoiceCSV } from '@/lib/export';

const SELLER = 'GSELLER';

vi.mock('@/lib/api', () => ({
  invoiceApi: {
    getAll: vi.fn(),
    getStats: vi.fn(),
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

vi.mock('@/components/InvoiceCard', () => ({ default: () => null }));
vi.mock('@/components/WalletConnect', () => ({ default: () => null }));
vi.mock('@/components/UserProfile', () => ({ default: () => null }));
vi.mock('@/components/TransactionHistory', () => ({ default: () => null }));
vi.mock('@/components/NetworkBadge', () => ({ default: () => null }));

function invoice(id: string, status: string, sellerPublicKey = SELLER) {
  return {
    id,
    status,
    sellerPublicKey,
    amount: 1,
    assetCode: 'XLM',
    memo: id,
  };
}

describe('Dashboard CSV exports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWalletStore).mockReturnValue({
      connected: true,
      publicKey: SELLER,
    } as never);
    vi.mocked(invoiceApi.getStats).mockResolvedValue({ data: [{}] } as never);
  });

  it('exports all paid pages while excluding invoices for another seller', async () => {
    const paidFirstPage = invoice('paid-1', 'PAID');
    const foreignInvoice = invoice('foreign', 'PAID', 'GOTHER');
    const paidSecondPage = invoice('paid-2', 'PAID');

    vi.mocked(invoiceApi.getAll).mockImplementation(async (params) => {
      if (params?.status !== 'PAID') {
        return { data: [], pagination: {} } as never;
      }
      if (!params.cursor) {
        return {
          data: [paidFirstPage, foreignInvoice],
          pagination: { nextCursor: 'paid-page-2' },
        } as never;
      }
      return { data: [paidSecondPage], pagination: {} } as never;
    });

    render(<DashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Export paid CSV' }));

    await waitFor(() => {
      expect(downloadPaidInvoiceCSV).toHaveBeenCalledWith(
        [paidFirstPage, paidSecondPage],
        SELLER,
      );
    });
  });

  it('exports all statuses across pages regardless of the visible status filter', async () => {
    const pending = invoice('pending-1', 'PENDING');
    const paid = invoice('paid-1', 'PAID');
    const allStatusPages = vi.fn(async (params) => {
      if (params?.status === 'PAID') {
        return { data: [paid], pagination: {} } as never;
      }
      if (!params?.cursor) {
        return { data: [pending], pagination: { nextCursor: 'all-page-2' } } as never;
      }
      return { data: [paid], pagination: {} } as never;
    });
    vi.mocked(invoiceApi.getAll).mockImplementation(allStatusPages);

    render(<DashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Paid' }));
    await waitFor(() => {
      expect(allStatusPages).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PAID' }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Export all CSV' }));
    await waitFor(() => {
      expect(downloadAllInvoicesCSV).toHaveBeenCalledWith([pending, paid], SELLER);
    });
  });
});
