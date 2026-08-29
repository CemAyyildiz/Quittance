import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AssetLogo from '../AssetLogo';

interface MockImageProps {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  onError?: () => void;
}

vi.mock('next/image', () => ({
  default: ({ src, alt, width, height, priority, onError }: MockImageProps) => (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      fetchpriority={priority ? 'high' : undefined}
      data-onerror-wired={onError ? 'true' : 'false'}
    />
  ),
}));

describe('AssetLogo', () => {
  it('renders an unknown asset code as plain text without an image', () => {
    const html = renderToStaticMarkup(<AssetLogo code="BTC" />);
    expect(html).toContain('BTC');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('coingecko');
  });

  it('forwards a custom className on the plain-text unknown asset span', () => {
    const html = renderToStaticMarkup(<AssetLogo code="DOGE" className="my-unknown" />);
    expect(html).toContain('my-unknown');
    expect(html).toContain('DOGE');
  });

  it('renders a known asset logo image inside a circle', () => {
    const html = renderToStaticMarkup(<AssetLogo code="XLM" />);
    expect(html).toContain('rounded-full');
    expect(html).toContain('overflow-hidden');
    expect(html).toContain(
      'src="https://assets.coingecko.com/coins/images/100/small/stellar-xlm-logo.png"',
    );
    expect(html).toContain('alt="Stellar Lumens"');
    expect(html).toContain('width="20"');
    expect(html).toContain('height="20"');
  });

  it('shows the human-readable asset name next to the logo by default', () => {
    const usdcHtml = renderToStaticMarkup(<AssetLogo code="USDC" />);
    expect(usdcHtml).toContain('<span class="font-semibold">USD Coin</span>');
  });

  it('hides the asset name when showName is false', () => {
    const html = renderToStaticMarkup(<AssetLogo code="USDC" showName={false} />);
    expect(html).not.toContain('<span class="font-semibold">');
    expect(html).toContain('src="https://assets.coingecko.com/coins/images/6319/small/usdc.png"');
  });

  it('honors a custom size for the circle and image', () => {
    const html = renderToStaticMarkup(<AssetLogo code="USDT" size={40} />);
    expect(html).toContain('width:40px');
    expect(html).toContain('height:40px');
    expect(html).toContain('width="36"');
    expect(html).toContain('height="36"');
  });

  it('forwards a custom className on the known-asset wrapper', () => {
    const html = renderToStaticMarkup(<AssetLogo code="XLM" className="my-logo" />);
    expect(html).toContain('my-logo');
  });

  it('forwards the priority flag to the image', () => {
    const html = renderToStaticMarkup(<AssetLogo code="XLM" priority />);
    expect(html).toContain('fetchpriority="high"');
  });

  it('wires an image error handler so a failed logo can fall back to the code circle', () => {
    const html = renderToStaticMarkup(<AssetLogo code="XLM" />);
    expect(html).toContain('data-onerror-wired="true"');
  });
});
