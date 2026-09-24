// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import InvoiceForm from '../InvoiceForm';

vi.mock('@/lib/api', () => ({
  invoiceApi: { create: vi.fn().mockResolvedValue({ data: {} }) },
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

afterEach(() => {
  cleanup();
});

describe('InvoiceForm client email validation', () => {
  it('shows no error while the field is empty', () => {
    render(<InvoiceForm />);
    const emailInput = screen.getByPlaceholderText('client@example.com — for sending the invoice');
    expect(screen.queryByText('Enter a valid email address')).toBeNull();
    expect(emailInput.getAttribute('aria-invalid')).toBe('false');
  });

  it('accepts a valid email address', () => {
    render(<InvoiceForm />);
    const emailInput = screen.getByPlaceholderText('client@example.com — for sending the invoice');
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    expect(screen.queryByText('Enter a valid email address')).toBeNull();
    expect(emailInput.getAttribute('aria-invalid')).toBe('false');
  });

  it('accepts a valid email address with a subdomain', () => {
    render(<InvoiceForm />);
    const emailInput = screen.getByPlaceholderText('client@example.com — for sending the invoice');
    fireEvent.change(emailInput, { target: { value: 'user@sub.example.com' } });
    expect(screen.queryByText('Enter a valid email address')).toBeNull();
  });

  it('rejects an email missing the @ sign', () => {
    render(<InvoiceForm />);
    const emailInput = screen.getByPlaceholderText('client@example.com — for sending the invoice');
    fireEvent.change(emailInput, { target: { value: 'userexample.com' } });
    expect(screen.getByText('Enter a valid email address')).toBeTruthy();
    expect(emailInput.getAttribute('aria-invalid')).toBe('true');
  });

  it('rejects an email missing a domain', () => {
    render(<InvoiceForm />);
    const emailInput = screen.getByPlaceholderText('client@example.com — for sending the invoice');
    fireEvent.change(emailInput, { target: { value: 'user@' } });
    expect(screen.getByText('Enter a valid email address')).toBeTruthy();
  });

  it('clears the error once the address becomes valid again', () => {
    render(<InvoiceForm />);
    const emailInput = screen.getByPlaceholderText('client@example.com — for sending the invoice');
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    expect(screen.getByText('Enter a valid email address')).toBeTruthy();

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    expect(screen.queryByText('Enter a valid email address')).toBeNull();
  });

  it('blocks submission with a client-side error when the email is invalid', async () => {
    const { invoiceApi } = await import('@/lib/api');
    render(<InvoiceForm userWallet="GABC1234567890" />);

    fireEvent.change(screen.getByPlaceholderText('10.00'), { target: { value: '5' } });
    fireEvent.change(screen.getByPlaceholderText('client@example.com — for sending the invoice'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }));

    expect(screen.getByText('Enter a valid client email')).toBeTruthy();
    expect(invoiceApi.create).not.toHaveBeenCalled();
  });
});
