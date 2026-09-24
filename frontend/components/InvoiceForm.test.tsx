import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import InvoiceForm from './InvoiceForm';

function amountInput(html: string) {
  const match = html.match(/<input[^>]*type="number"[^>]*>/);
  expect(match).not.toBeNull();
  return match![0];
}

describe('InvoiceForm amount validation a11y wiring', () => {
  it('does not reference an error element on the amount input while the amount is valid', () => {
    const html = renderToStaticMarkup(<InvoiceForm />);

    expect(amountInput(html)).toContain('aria-invalid="false"');
    expect(amountInput(html)).not.toContain('aria-describedby');
  });

  it('renders no amount error element while the amount is valid', () => {
    const html = renderToStaticMarkup(<InvoiceForm />);

    expect(amountInput(html)).not.toContain('aria-describedby');
    expect(html).not.toContain('id="amount-error"');
  });
});
