import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import PaymentLinkCopy from '../PaymentLinkCopy';
import { copyToClipboard } from '@/lib/utils';
import { paymentUrlBuilder } from '@/lib/paymentUrlBuilder';

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils')>('@/lib/utils');
  return { ...actual, copyToClipboard: vi.fn() };
});

const copyMock = vi.mocked(copyToClipboard);

afterEach(() => {
  copyMock.mockReset();
});

describe('PaymentLinkCopy', () => {
  it('copies the built payment URL without including the customer email', async () => {
    const url = paymentUrlBuilder('https://quittance.example', 'invoice-42');
    copyMock.mockResolvedValue(true);
    render(<PaymentLinkCopy url={url} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy payment link' }));

    await waitFor(() => expect(copyMock).toHaveBeenCalledWith(url));
    expect(copyMock.mock.calls[0][0]).not.toContain('client@example.com');
    expect(screen.getByRole('link', { name: url })).toHaveAttribute('href', url);
  });

  it('keeps the payment URL visible if copying fails', async () => {
    const url = paymentUrlBuilder('https://quittance.example', 'invoice-42');
    copyMock.mockResolvedValue(false);
    render(<PaymentLinkCopy url={url} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy payment link' }));

    await waitFor(() => expect(copyMock).toHaveBeenCalledWith(url));
    expect(screen.getByRole('link', { name: url })).toBeVisible();
  });
});
