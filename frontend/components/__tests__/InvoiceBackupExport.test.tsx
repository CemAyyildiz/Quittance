import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import InvoiceBackupExport from '../InvoiceBackupExport';
import { downloadInvoiceBackup } from '@/lib/invoice-backup';

vi.mock('@/lib/invoice-backup', () => ({ downloadInvoiceBackup: vi.fn().mockResolvedValue(undefined) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('invoice backup consent', () => {
  it('defaults to excluding email and shows a completed download state', async () => {
    render(<InvoiceBackupExport sellerPublicKey="GSELLER" />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Download JSON backup' }));
    await waitFor(() => expect(downloadInvoiceBackup).toHaveBeenCalledWith('GSELLER', false));
    expect(await screen.findByRole('status')).toHaveTextContent('JSON backup downloaded.');
  });

  it('requires explicit consent and resets it when the wallet changes', async () => {
    const { rerender } = render(<InvoiceBackupExport sellerPublicKey="GSELLER" />);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Download JSON backup' }));
    await waitFor(() => expect(downloadInvoiceBackup).toHaveBeenCalledWith('GSELLER', true));
    rerender(<InvoiceBackupExport sellerPublicKey="GOTHER" />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('shows failure and permits retry rather than claiming a successful backup', async () => {
    vi.mocked(downloadInvoiceBackup).mockRejectedValueOnce(new Error('unavailable'));
    render(<InvoiceBackupExport sellerPublicKey="GSELLER" />);
    fireEvent.click(screen.getByRole('button', { name: 'Download JSON backup' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Could not download'));
    expect(screen.getByRole('button', { name: 'Download JSON backup' })).toBeEnabled();
  });
});
