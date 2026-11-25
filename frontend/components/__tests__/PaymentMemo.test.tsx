import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PaymentMemo from '../PaymentMemo';
import { copyToClipboard } from '@/lib/utils';

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils')>('@/lib/utils');
  return { ...actual, copyToClipboard: vi.fn() };
});

const copyMock = vi.mocked(copyToClipboard);

describe('PaymentMemo', () => {
  beforeEach(() => {
    copyMock.mockReset();
    copyMock.mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows the exact stored memo and copies that same string', async () => {
    const memo = 'INV-2026-00042 / ACCT-77';
    render(<PaymentMemo memo={memo} />);

    expect(screen.getByTestId('payment-memo')).toHaveTextContent(memo);

    fireEvent.click(screen.getByRole('button', { name: 'Copy memo' }));

    await waitFor(() => expect(copyMock).toHaveBeenCalledWith(memo));
    expect(screen.getByRole('button', { name: 'Copy memo' })).toHaveTextContent('Copied');
  });

  it('does not offer a whitespace-only memo as a copyable value', () => {
    render(<PaymentMemo memo="   " />);

    expect(screen.getByTestId('payment-memo').textContent).toBe('   ');
    expect(screen.queryByRole('button', { name: 'Copy memo' })).not.toBeInTheDocument();
    expect(screen.getByText(/no usable memo text to copy/i)).toBeInTheDocument();
  });

  it('keeps the memo visible when the clipboard write fails', async () => {
    copyMock.mockResolvedValue(false);
    render(<PaymentMemo memo="INV-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy memo' }));

    await waitFor(() => expect(copyMock).toHaveBeenCalledWith('INV-1'));
    expect(screen.getByTestId('payment-memo')).toHaveTextContent('INV-1');
    expect(screen.queryByText('Copied')).not.toBeInTheDocument();
  });
});
