// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import InvoiceForm from '../InvoiceForm';
import { encodeMuxedAccount, encodeMuxedAccountToAddress } from '@stellar/stellar-sdk';

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
const SELLER_PUBLIC_KEY = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

describe('InvoiceForm seller display name', () => {
  it('submits a trimmed invoice label and keeps the connected wallet as identity', async () => {
    const { invoiceApi } = await import('@/lib/api');
    render(<InvoiceForm userWallet="GABC1234567890" />);
    const label = screen.getByLabelText('Your display name (optional)');
    expect(label.getAttribute('maxlength')).toBe('80');
    fireEvent.change(label, { target: { value: '  Studio & Co  ' } });
    fireEvent.change(screen.getByPlaceholderText('10.00'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }));
    await waitFor(() => expect(invoiceApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ sellerName: 'Studio & Co', sellerPublicKey: 'GABC1234567890' }),
    ));
    await waitFor(() => expect((label as HTMLInputElement).value).toBe(''));
  });
});

describe('InvoiceForm muxed payment address', () => {
  it('submits a valid muxed address belonging to the connected seller', async () => {
    const { invoiceApi } = await import('@/lib/api');
    const muxedAddress = encodeMuxedAccountToAddress(
      encodeMuxedAccount(SELLER_PUBLIC_KEY, '42'),
      true,
    );
    render(<InvoiceForm userWallet={SELLER_PUBLIC_KEY} />);

    fireEvent.change(screen.getByPlaceholderText('10.00'), {
      target: { value: '5' },
    });
    fireEvent.change(screen.getByLabelText('Muxed payment address (optional)'), {
      target: { value: muxedAddress },
    });
    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }));

    await waitFor(() =>
      expect(invoiceApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ sellerPublicKey: muxedAddress }),
        expect.objectContaining({ idempotencyKey: expect.any(String) }),
      ),
    );
  });

  it('rejects a muxed address belonging to a different wallet', async () => {
    const { invoiceApi } = await import('@/lib/api');
    const muxedAddress = encodeMuxedAccountToAddress(
      encodeMuxedAccount('GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V', '42'),
      true,
    );
    render(<InvoiceForm userWallet={SELLER_PUBLIC_KEY} />);

    fireEvent.change(screen.getByPlaceholderText('10.00'), {
      target: { value: '5' },
    });
    fireEvent.change(screen.getByLabelText('Muxed payment address (optional)'), {
      target: { value: muxedAddress },
    });
    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }));

    expect(
      await screen.findByText('The muxed address must belong to your connected wallet'),
    ).toBeTruthy();
    expect(invoiceApi.create).not.toHaveBeenCalled();
  });
});

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
    expect(submit.disabled).toBe(false);
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
        expect.objectContaining({ idempotencyKey: expect.any(String) }),
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

describe('InvoiceForm idempotent submit', () => {
  it('sends an Idempotency-Key and ignores a second submit while the first is pending', async () => {
    const { invoiceApi } = await import('@/lib/api');
    let resolveCreate: (value: unknown) => void = () => {};
    vi.mocked(invoiceApi.create).mockImplementationOnce(
      () => new Promise((resolve) => (resolveCreate = resolve)) as any,
    );
    render(<InvoiceForm userWallet="GABC1234567890" />);

    fireEvent.change(screen.getByPlaceholderText('10.00'), { target: { value: '5' } });
    const form = screen.getByRole('button', { name: /create invoice/i }).closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(invoiceApi.create).toHaveBeenCalledTimes(1);
    const [, options] = vi.mocked(invoiceApi.create).mock.calls[0] as any[];
    expect(typeof options.idempotencyKey).toBe('string');
    expect(options.idempotencyKey.length).toBeGreaterThan(0);
    expect(options.idempotencyKey.length).toBeLessThanOrEqual(128);

    const busy = screen.getByRole('button', { name: /creating/i }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);

    resolveCreate({ data: {} });
    await waitFor(() => {
      const submit = screen.getByRole('button', { name: /create invoice/i }) as HTMLButtonElement;
      expect(submit.disabled).toBe(false);
    });
  });

  it('uses a new key for each submit attempt', async () => {
    const { invoiceApi } = await import('@/lib/api');
    vi.mocked(invoiceApi.create).mockRejectedValueOnce(new Error('network'));
    render(<InvoiceForm userWallet="GABC1234567890" />);

    fireEvent.change(screen.getByPlaceholderText('10.00'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }));
    await waitFor(() => expect(invoiceApi.create).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      const submit = screen.getByRole('button', { name: /create invoice/i }) as HTMLButtonElement;
      expect(submit.disabled).toBe(false);
    });

    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }));
    await waitFor(() => expect(invoiceApi.create).toHaveBeenCalledTimes(2));

    const calls = vi.mocked(invoiceApi.create).mock.calls as any[][];
    expect(calls[0][1].idempotencyKey).not.toBe(calls[1][1].idempotencyKey);
  });
});
