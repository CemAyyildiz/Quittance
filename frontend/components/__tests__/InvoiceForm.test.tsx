// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
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

/**
 * jsdom applies the email value-sanitization algorithm (stripping leading and
 * trailing whitespace) to <input type="email">, so a plain fireEvent.change
 * can never deliver a whitespace-only value to the component. Override the
 * value IDL attribute so the change event carries the raw string a user could
 * type, while leaving the input as type="email".
 */
function changeEmailTo(input: HTMLElement, value: string) {
  Object.defineProperty(input, 'value', {
    configurable: true,
    get: () => value,
    set: () => {},
  });
  fireEvent.change(input, { bubbles: true });
}

const MEMO_PLACEHOLDER = 'Payment reference, e.g. INV-2026';

describe('InvoiceForm memo byte limit', () => {
  it('shows a live byte count for the memo', () => {
    render(<InvoiceForm />);
    const memoInput = screen.getByPlaceholderText(MEMO_PLACEHOLDER);

    expect(screen.getByText('0/28 bytes')).toBeTruthy();

    fireEvent.change(memoInput, { target: { value: 'hello' } });
    expect(screen.getByText('5/28 bytes')).toBeTruthy();
    expect(memoInput.getAttribute('aria-invalid')).toBe('false');
  });

  it('counts UTF-8 bytes and blocks submission over 28 bytes', async () => {
    const { invoiceApi } = await import('@/lib/api');
    render(<InvoiceForm userWallet="GABC1234567890" />);

    fireEvent.change(screen.getByPlaceholderText('10.00'), { target: { value: '5' } });
    const memoInput = screen.getByPlaceholderText(MEMO_PLACEHOLDER);
    fireEvent.change(memoInput, { target: { value: 'é'.repeat(15) } });

    expect(screen.getByText('30/28 bytes')).toBeTruthy();
    expect(memoInput.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText(/Stellar allows at most 28 bytes/i)).toBeTruthy();

    const submit = screen.getByRole('button', { name: /create invoice/i }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.click(submit);
    expect(invoiceApi.create).not.toHaveBeenCalled();
  });

  it('submits a memo of exactly 28 bytes', async () => {
    const { invoiceApi } = await import('@/lib/api');
    render(<InvoiceForm userWallet="GABC1234567890" />);

    fireEvent.change(screen.getByPlaceholderText('10.00'), { target: { value: '5' } });
    fireEvent.change(screen.getByPlaceholderText(MEMO_PLACEHOLDER), {
      target: { value: 'a'.repeat(28) },
    });
    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }));

    await waitFor(() =>
      expect(invoiceApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ memo: 'a'.repeat(28) }),
      ),
    );
  });
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

  it('rejects a whitespace-only email and marks the field invalid', () => {
    render(<InvoiceForm />);
    const emailInput = screen.getByPlaceholderText('client@example.com — for sending the invoice');

    changeEmailTo(emailInput, '   ');

    expect(screen.getByText('Enter a valid email address')).toBeTruthy();
    expect(emailInput.getAttribute('aria-invalid')).toBe('true');
  });

  it('rejects an address with a leading space', () => {
    render(<InvoiceForm />);
    const emailInput = screen.getByPlaceholderText('client@example.com — for sending the invoice');

    changeEmailTo(emailInput, ' user@example.com');

    expect(screen.getByText('Enter a valid email address')).toBeTruthy();
    expect(emailInput.getAttribute('aria-invalid')).toBe('true');
  });

  it('clears the error when the field is emptied again', () => {
    render(<InvoiceForm />);
    const emailInput = screen.getByPlaceholderText('client@example.com — for sending the invoice');

    changeEmailTo(emailInput, '   ');
    expect(screen.getByText('Enter a valid email address')).toBeTruthy();

    changeEmailTo(emailInput, '');
    expect(screen.queryByText('Enter a valid email address')).toBeNull();
    expect(emailInput.getAttribute('aria-invalid')).toBe('false');
  });
});
