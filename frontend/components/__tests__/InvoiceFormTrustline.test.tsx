// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import InvoiceForm from '../InvoiceForm';

vi.mock('@/lib/api', () => ({
  invoiceApi: { create: vi.fn() },
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

afterEach(() => cleanup());

describe('InvoiceForm seller trustline warning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the server warning and requires acknowledgement before create succeeds', async () => {
    const { invoiceApi } = await import('@/lib/api');
    (invoiceApi.create as any)
      .mockRejectedValueOnce({
        response: {
          status: 409,
          data: { code: 'SELLER_TRUSTLINE_WARNING', warning: 'No USDC trustline for the seller' },
        },
      })
      .mockResolvedValueOnce({ data: { id: 'inv-1' } });

    render(<InvoiceForm userWallet={'G' + 'A'.repeat(55)} />);
    fireEvent.change(screen.getByPlaceholderText('10.00'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('No USDC trustline for the seller');
    });
    expect(invoiceApi.create).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }));

    await waitFor(() => expect(invoiceApi.create).toHaveBeenCalledTimes(2));
    const secondCall = (invoiceApi.create as any).mock.calls[1][0];
    expect(secondCall.acknowledgeNoTrustline).toBe(true);
  });
});
