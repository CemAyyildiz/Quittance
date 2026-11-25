// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import InvoiceForm from '../InvoiceForm';

vi.mock('@/lib/api', () => ({
  invoiceApi: { create: vi.fn().mockResolvedValue({ data: {} }) },
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/stellar', () => ({
  checkAssetReadiness: vi.fn().mockResolvedValue('ok'),
  getWalletNetwork: vi.fn().mockResolvedValue('TESTNET'),
  getConfiguredNetwork: () => 'TESTNET',
  getNetworkMismatch: (wallet: string, configured: string) =>
    wallet !== 'UNKNOWN' && wallet !== configured,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function localDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

describe('InvoiceForm amount decimal places', () => {
  it('rejects an amount with more than seven decimal places', async () => {
    const { invoiceApi } = await import('@/lib/api');
    render(<InvoiceForm userWallet="GABC1234567890" />);

    fireEvent.change(screen.getByPlaceholderText('10.00'), {
      target: { value: '1.12345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }));

    expect(screen.getByText('Amount can have at most 7 decimal places')).toBeTruthy();
    expect(invoiceApi.create).not.toHaveBeenCalled();
  });

  it('still creates an invoice with seven decimal places', async () => {
    const { invoiceApi } = await import('@/lib/api');
    render(<InvoiceForm userWallet="GABC1234567890" />);

    fireEvent.change(screen.getByPlaceholderText('10.00'), {
      target: { value: '1.1234567' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }));

    await waitFor(() =>
      expect(invoiceApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1.1234567 }),
        expect.anything(),
      ),
    );
  });
});

describe('InvoiceForm expiry', () => {
  it('rejects an expiry that is already in the past', async () => {
    const { invoiceApi } = await import('@/lib/api');
    render(<InvoiceForm userWallet="GABC1234567890" />);

    fireEvent.change(screen.getByPlaceholderText('10.00'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Expiry (optional)'), {
      target: { value: localDateTime(new Date(Date.now() - 60_000)) },
    });
    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }));

    expect(screen.getByText('Expiry must be in the future')).toBeTruthy();
    expect(invoiceApi.create).not.toHaveBeenCalled();
  });

  it('sends a future expiry as an ISO instant', async () => {
    const { invoiceApi } = await import('@/lib/api');
    const future = new Date(Date.now() + 60 * 60 * 1000);
    render(<InvoiceForm userWallet="GABC1234567890" />);

    fireEvent.change(screen.getByPlaceholderText('10.00'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Expiry (optional)'), {
      target: { value: localDateTime(future) },
    });
    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }));

    await waitFor(() =>
      expect(invoiceApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ expiresAt: expect.stringMatching(/Z$/) }),
        expect.anything(),
      ),
    );
  });
});
