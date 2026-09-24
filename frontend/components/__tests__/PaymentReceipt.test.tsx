import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PaymentReceipt from '../PaymentReceipt';

const baseInvoice = {
  id: 'inv-fixture-001',
  status: 'paid',
  amount: '125.5000000',
  assetCode: 'USDC',
  paidAt: '2026-01-15T10:30:00.000Z',
  description: 'Consulting services',
  sellerPublicKey: 'GSELLERPUBLICKEYFIXTUREAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  payerPublicKey: 'GPAYERPUBLICKEYFIXTUREAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  paymentTxHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff',
  memo: 'INV-FIXTURE-001',
};

describe('PaymentReceipt', () => {
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
      <PaymentReceipt invoice={{ ...baseInvoice, payerPublicKey: undefined }} />
    );
    expect(html).not.toContain('From (Payer Address)');
  });

  it('shows the Email Proof action only when a customer email is present', () => {
    const withoutEmail = renderToStaticMarkup(<PaymentReceipt invoice={baseInvoice} />);
    expect(withoutEmail).not.toContain('Email Proof');

    const withEmail = renderToStaticMarkup(
      <PaymentReceipt invoice={{ ...baseInvoice, customerEmail: 'client@example.com' }} />
    );
    expect(withEmail).toContain('Email Proof');
  });
});
