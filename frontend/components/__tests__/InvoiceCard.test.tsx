import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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
});
