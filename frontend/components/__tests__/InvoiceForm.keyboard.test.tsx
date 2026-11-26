import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import InvoiceForm from '../InvoiceForm';
import { invoiceApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({ invoiceApi: { create: vi.fn().mockResolvedValue({ data: {} }) } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/stellar', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/stellar')>(),
  isFreighterInstalled: vi.fn().mockResolvedValue(true),
  getUserPublicKey: vi.fn().mockResolvedValue('GABC1234567890'),
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('keyboard invoice creation', () => {
  it('gives every input a visible associated label', () => {
    render(<InvoiceForm />);
    for (const label of ['Invoice Amount *', 'Asset', 'Description', 'Memo (optional)', 'Client name (optional)', 'Client email (optional)']) {
      const input = screen.getByLabelText(label);
      expect(input).toBeVisible();
      expect(document.querySelector(`label[for="${input.id}"]`)).toBeVisible();
    }
  });

  it('announces an invalid submit and focuses the first invalid field', async () => {
    render(<InvoiceForm userWallet="GABC1234567890" />);
    fireEvent.click(screen.getByRole('button', { name: 'Create Invoice' }));
    await waitFor(() => {
      expect(screen.getByLabelText('Invoice Amount *')).toHaveFocus();
      expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid amount');
    });
    expect(invoiceApi.create).not.toHaveBeenCalled();
  });

  it('focuses the memo before an invalid email because it comes first in tab order', async () => {
    render(<InvoiceForm userWallet="GABC1234567890" />);
    fireEvent.change(screen.getByLabelText('Invoice Amount *'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Memo (optional)'), { target: { value: 'x'.repeat(29) } });
    fireEvent.change(screen.getByLabelText('Client email (optional)'), { target: { value: 'invalid' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Invoice' }));
    await waitFor(() => expect(screen.getByLabelText('Memo (optional)')).toHaveFocus());
    expect(invoiceApi.create).not.toHaveBeenCalled();
  });

  it('focuses and announces an invalid email when earlier fields are valid', async () => {
    render(<InvoiceForm userWallet="GABC1234567890" />);
    fireEvent.change(screen.getByLabelText('Invoice Amount *'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Client email (optional)'), { target: { value: 'invalid' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Invoice' }));
    await waitFor(() => {
      expect(screen.getByLabelText('Client email (optional)')).toHaveFocus();
      expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid client email');
    });
  });

  it('keeps focus on the create action after a valid submit', async () => {
    render(<InvoiceForm userWallet="GABC1234567890" />);
    fireEvent.change(screen.getByLabelText('Invoice Amount *'), { target: { value: '5' } });
    const submit = screen.getByRole('button', { name: 'Create Invoice' });
    submit.focus();
    fireEvent.submit(submit.closest('form')!);
    await waitFor(() => expect(invoiceApi.create).toHaveBeenCalledOnce());
    await waitFor(() => expect(submit).toHaveTextContent('Create Invoice'));
    expect(submit).toHaveFocus();
  });
});
