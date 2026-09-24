import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { explorerTxUrl } from '@/lib/explorerUrl';

// PaymentStatus.tsx relies on Next.js' automatic JSX runtime and does not
// `import React`; vitest compiles JSX to `React.createElement`, so the free
// `React` reference inside the component is undefined at module load. Expose
// React on globalThis before the component module is evaluated below.
(globalThis as { React?: unknown }).React = React;

// Import the component dynamically (after the globalThis assignment above)
// so its module body sees React in scope.
const { default: PaymentStatus } = await import('../PaymentStatus');

describe('PaymentStatus', () => {
  // A 64-char hex string that passes the explorer helper's validation.
  const TX_HASH = 'a'.repeat(64);

  it('renders success copy when status is PAID', () => {
    const html = renderToStaticMarkup(<PaymentStatus status="PAID" />);
    expect(html).toContain('Payment Successful!');
    expect(html).toContain('This invoice has been paid.');
  });

  it('renders expired copy when status is EXPIRED', () => {
    const html = renderToStaticMarkup(<PaymentStatus status="EXPIRED" />);
    expect(html).toContain('Invoice Expired');
    expect(html).toContain('This invoice is no longer valid.');
  });

  it('renders pending copy when status is PENDING', () => {
    const html = renderToStaticMarkup(<PaymentStatus status="PENDING" />);
    expect(html).toContain('Waiting for Payment');
    expect(html).toContain('Complete the payment to proceed.');
  });

  it('renders cancelled copy when status is CANCELLED', () => {
    const html = renderToStaticMarkup(<PaymentStatus status="CANCELLED" />);
    expect(html).toContain('Invoice Cancelled');
    expect(html).toContain('This invoice has been cancelled.');
  });

  it('renders explorer link with the transaction URL when txHash is set', () => {
    const html = renderToStaticMarkup(
      <PaymentStatus status="PAID" txHash={TX_HASH} />
    );
    expect(html).toContain('View on Stellar Explorer');
    expect(html).toContain(`href="${explorerTxUrl(TX_HASH)}"`);
  });

  it('does not render an explorer link when txHash is absent', () => {
    const html = renderToStaticMarkup(<PaymentStatus status="PAID" />);
    expect(html).not.toContain('View on Stellar Explorer');
    expect(html).not.toContain('stellar.expert');
  });
});
