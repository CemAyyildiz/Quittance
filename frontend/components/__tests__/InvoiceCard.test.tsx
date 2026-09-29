import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import InvoiceCard from '../InvoiceCard';

const sampleInvoice = {
  id: 'inv-001',
  amount: 250,
  assetCode: 'XLM',
  status: 'PENDING',
  createdAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-01-02T00:00:00.000Z',
  memo: 'INV-1A2B3C-D4E5F6GH',
};

describe('InvoiceCard', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders amount, memo, and status', () => {
    // InvoiceCard reads window.location.origin during render to build the
    // payment link; the suite runs under environment: 'node' (see
    // vitest.config.ts), so stub just enough of `window` for this render.
    vi.stubGlobal('window', { location: { origin: 'https://example.com' } });

    const html = renderToStaticMarkup(<InvoiceCard invoice={sampleInvoice} />);

    expect(html).toContain('250.00');
    expect(html).toContain('XLM');
    expect(html).toContain(sampleInvoice.memo);
    expect(html).toContain('Pending');
  });

  // The two icon-only controls are the card's only unlabeled buttons, so their
  // accessible names are asserted through the rendered DOM rather than markup.
  it('exposes the copy control as "Copy invoice link" while the invoice is pending', () => {
    render(<InvoiceCard invoice={sampleInvoice} />);

    expect(screen.getByRole('button', { name: 'Copy invoice link' })).toBeInTheDocument();
  });

  it('exposes the email control as "Email payment proof" for a paid invoice with a customer email', () => {
    render(
      <InvoiceCard
        invoice={{ ...sampleInvoice, status: 'PAID', customerEmail: 'client@example.com' }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Email payment proof' })).toBeInTheDocument();
  });

  it('does not expose either icon-only control when its action is unavailable', () => {
    render(<InvoiceCard invoice={{ ...sampleInvoice, status: 'PAID', customerEmail: undefined }} />);

    expect(screen.queryByRole('button', { name: 'Copy invoice link' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Email payment proof' })).not.toBeInTheDocument();
  });
});
