import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import QRCodeDisplay from '../QRCodeDisplay';

const validPaymentUrl = 'https://example.com/payment';
const base64DataUrl = 'data:image/png;base64,abc123';

describe('QRCodeDisplay', () => {
  it('renders QR code SVG for shareable value', () => {
    const html = renderToStaticMarkup(
      <QRCodeDisplay value={validPaymentUrl} />
    );
    expect(html).toContain('svg');
  });

  it('renders error message for base64 data URL', () => {
    const html = renderToStaticMarkup(
      <QRCodeDisplay value={base64DataUrl} />
    );
    expect(html).toContain('QR preview unavailable');
  });

  it('does not render QR code for base64 data URL', () => {
    const html = renderToStaticMarkup(
      <QRCodeDisplay value={base64DataUrl} />
    );
    expect(html).not.toContain('QRCodeSVG');
    expect(html).toContain('text-red-600');
  });

  it('renders QR code with title', () => {
    const html = renderToStaticMarkup(
      <QRCodeDisplay value={validPaymentUrl} title='Payment QR' />
    );
    expect(html).toContain('Payment QR');
  });

  it('renders QR code with custom size', () => {
    const html = renderToStaticMarkup(
      <QRCodeDisplay value={validPaymentUrl} size={512} />
    );
    expect(html).toContain('512');
  });

  it('renders with showCopy=false hides copy button', () => {
    const html = renderToStaticMarkup(
      <QRCodeDisplay value={validPaymentUrl} showCopy={false} />
    );
    expect(html).not.toContain('btn-secondary');
  });

  it('renders with showCopy=true shows copy button for shareable value', () => {
    const html = renderToStaticMarkup(
      <QRCodeDisplay value={validPaymentUrl} showCopy={true} />
    );
    expect(html).toContain('btn-secondary');
  });

  it('renders copy disabled state when not shareable', () => {
    const html = renderToStaticMarkup(
      <QRCodeDisplay value={base64DataUrl} showCopy={true} />
    );
    expect(html).toContain('Nothing shareable to copy');
  });
});