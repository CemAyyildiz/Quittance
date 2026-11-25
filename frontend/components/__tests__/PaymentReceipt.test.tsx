import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PaymentReceipt from '../PaymentReceipt';
import { copyToClipboard } from '@/lib/utils';

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils')>('@/lib/utils');
  return { ...actual, copyToClipboard: vi.fn() };
});

const baseInvoice = {
  id: 'inv-fixture-001',
  status: 'PAID',
  amount: '125.5000000',
  assetCode: 'USDC',
  paidAt: '2026-01-15T10:30:00.000Z',
  description: 'Consulting services',
  sellerPublicKey: 'GSELLERPUBLICKEYFIXTUREAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  payerPublicKey: 'GPAYERPUBLICKEYFIXTUREAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  paymentTxHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00',
  memo: 'INV-FIXTURE-001',
};

describe('PaymentReceipt', () => {
  it('copies only the full payment transaction hash', async () => {
    vi.mocked(copyToClipboard).mockResolvedValueOnce(true);
    render(<PaymentReceipt invoice={baseInvoice} />);

    expect(screen.getByText(baseInvoice.paymentTxHash)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Copy hash' }));

    await waitFor(() => expect(copyToClipboard).toHaveBeenCalledWith(baseInvoice.paymentTxHash));
    expect(screen.getByRole('button', { name: 'Hash copied' })).toBeInTheDocument();
  });

  it('keeps the hash visible when copying fails', async () => {
    vi.mocked(copyToClipboard).mockResolvedValueOnce(false);
    render(<PaymentReceipt invoice={baseInvoice} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy hash' }));

    await waitFor(() => expect(copyToClipboard).toHaveBeenCalledWith(baseInvoice.paymentTxHash));
    expect(screen.getByText(baseInvoice.paymentTxHash)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Copy hash' })).toBeInTheDocument();
  });

  it('does not show a hash control or paid receipt for a pending invoice', () => {
    render(<PaymentReceipt invoice={{ ...baseInvoice, status: 'PENDING' }} />);

    expect(screen.queryByRole('button', { name: 'Copy hash' })).not.toBeInTheDocument();
    expect(screen.queryByText('Payment Confirmed')).not.toBeInTheDocument();
  });

  it('does not present an invalid payment hash as paid', () => {
    render(<PaymentReceipt invoice={{ ...baseInvoice, paymentTxHash: 'invalid-hash' }} />);

    expect(screen.queryByRole('button', { name: 'Copy hash' })).not.toBeInTheDocument();
    expect(screen.queryByText('Payment Confirmed')).not.toBeInTheDocument();
  });

  it('renders the transaction hash link to the Stellar explorer', () => {
    const html = renderToStaticMarkup(<PaymentReceipt invoice={baseInvoice} />);
    expect(html).toContain(`/tx/${baseInvoice.paymentTxHash}`);
    expect(html).toContain('View on Stellar Explorer');
  });

  it('renders the formatted paid amount and asset code', () => {
    const html = renderToStaticMarkup(<PaymentReceipt invoice={baseInvoice} />);
    expect(html).toContain('125.5000000');
    expect(html).toContain('USDC');
  });

  it('renders the memo field', () => {
    const html = renderToStaticMarkup(<PaymentReceipt invoice={baseInvoice} />);
    expect(html).toContain(baseInvoice.memo);
  });

  it('renders the transaction hash text and payer/recipient addresses', () => {
    const html = renderToStaticMarkup(<PaymentReceipt invoice={baseInvoice} />);
    expect(html).toContain(baseInvoice.paymentTxHash);
    expect(html).toContain(baseInvoice.payerPublicKey);
    expect(html).toContain(baseInvoice.sellerPublicKey);
  });

  it('omits the payer address block when payerPublicKey is absent', () => {
    const html = renderToStaticMarkup(
      <PaymentReceipt invoice={{ ...baseInvoice, payerPublicKey: undefined }} />,
    );
    expect(html).not.toContain('From (Payer Address)');
  });

  it('shows the Email Proof action only when a customer email is present', () => {
    const withoutEmail = renderToStaticMarkup(<PaymentReceipt invoice={baseInvoice} />);
    expect(withoutEmail).not.toContain('Email Proof');

    const withEmail = renderToStaticMarkup(
      <PaymentReceipt invoice={{ ...baseInvoice, customerEmail: 'client@example.com' }} />,
    );
    expect(withEmail).toContain('Email Proof');
  });

  it('shows the Download Proof action with and without a customer email', () => {
    const withoutEmail = renderToStaticMarkup(<PaymentReceipt invoice={baseInvoice} />);
    expect(withoutEmail).toContain('Download Proof');

    const withEmail = renderToStaticMarkup(
      <PaymentReceipt invoice={{ ...baseInvoice, customerEmail: 'client@example.com' }} />,
    );
    expect(withEmail).toContain('Download Proof');
  });

  it('hides proof actions when seller access is unavailable', () => {
    const html = renderToStaticMarkup(
      <PaymentReceipt
        invoice={{ ...baseInvoice, customerEmail: 'client@example.com' }}
        showProofActions={false}
      />,
    );
    expect(html).not.toContain('Download Proof');
    expect(html).not.toContain('Email Proof');
    expect(html).toContain('Payment Receipt');
  });

  it('does not offer Download Proof for an unpaid invoice', () => {
    const html = renderToStaticMarkup(
      <PaymentReceipt invoice={{ ...baseInvoice, status: 'PENDING' }} />,
    );
    expect(html).not.toContain('Download Proof');
  });
});
