import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AmountDisplay from '../AmountDisplay';

describe('AmountDisplay', () => {
  it('renders the formatted amount with default 7 decimals', () => {
    const html = renderToStaticMarkup(
      <AmountDisplay amount={1234.5} assetCode="USDC" />
    );
    expect(html).toContain('1,234.5000000');
    expect(html).toContain('USDC');
  });

  it('exposes an accessible aria-label combining amount and asset code', () => {
    const html = renderToStaticMarkup(
      <AmountDisplay amount={1234.5} assetCode="USDC" />
    );
    expect(html).toContain('aria-label="1,234.5000000 USDC"');
  });

  it('formats string amounts', () => {
    const html = renderToStaticMarkup(
      <AmountDisplay amount="500" assetCode="XLM" />
    );
    expect(html).toContain('500.0000000');
    expect(html).toContain('aria-label="500.0000000 XLM"');
  });

  it('honors a custom decimals value', () => {
    const html = renderToStaticMarkup(
      <AmountDisplay amount={99.9} assetCode="USDC" decimals={2} />
    );
    expect(html).toContain('99.90');
    expect(html).toContain('aria-label="99.90 USDC"');
  });

  it('renders zero with the configured decimals', () => {
    const html = renderToStaticMarkup(
      <AmountDisplay amount={0} assetCode="XLM" />
    );
    expect(html).toContain('0.0000000');
    expect(html).toContain('aria-label="0.0000000 XLM"');
  });

  it('renders large amounts with thousands separators', () => {
    const html = renderToStaticMarkup(
      <AmountDisplay amount={1000000} assetCode="USDC" />
    );
    expect(html).toContain('1,000,000.0000000');
    expect(html).toContain('aria-label="1,000,000.0000000 USDC"');
  });

  it('applies size-specific styling classes', () => {
    const sm = renderToStaticMarkup(
      <AmountDisplay amount={1} assetCode="XLM" size="sm" />
    );
    expect(sm).toContain('text-sm');
    expect(sm).toContain('text-xs');

    const lg = renderToStaticMarkup(
      <AmountDisplay amount={1} assetCode="XLM" size="lg" />
    );
    expect(lg).toContain('text-2xl');
    expect(lg).toContain('text-base');
  });

  it('forwards a custom className', () => {
    const html = renderToStaticMarkup(
      <AmountDisplay amount={1} assetCode="XLM" className="my-amount" />
    );
    expect(html).toContain('my-amount');
  });
});
