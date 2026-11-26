import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AmountDisplay from '../AmountDisplay';

describe('AmountDisplay', () => {
  it('renders the formatted amount with default 7 decimals', () => {
    const html = renderToStaticMarkup(
      <AmountDisplay amount={1234.5} assetCode="USDC" />
    );
    expect(html).toContain('1,234.5');
    expect(html).toContain('USDC');
  });

  it('exposes an accessible aria-label combining amount and asset code', () => {
    const html = renderToStaticMarkup(
      <AmountDisplay amount={1234.5} assetCode="USDC" />
    );
    expect(html).toContain('aria-label="1,234.5 USDC"');
  });

  it('formats string amounts', () => {
    const html = renderToStaticMarkup(
      <AmountDisplay amount="500" assetCode="XLM" />
    );
    expect(html).toContain('500');
    expect(html).toContain('aria-label="500 XLM"');
  });

  it('honors a custom decimals value', () => {
    const html = renderToStaticMarkup(
      <AmountDisplay amount={99.9} assetCode="USDC" decimals={2} />
    );
    expect(html).toContain('99.9');
    expect(html).toContain('aria-label="99.9 USDC"');
  });

  it('renders zero with the configured decimals', () => {
    const html = renderToStaticMarkup(
      <AmountDisplay amount={0} assetCode="XLM" />
    );
    expect(html).toContain('0');
    expect(html).toContain('aria-label="0 XLM"');
  });

  it('renders large amounts with thousands separators', () => {
    const html = renderToStaticMarkup(
      <AmountDisplay amount={1000000} assetCode="USDC" />
    );
    expect(html).toContain('1,000,000');
    expect(html).toContain('aria-label="1,000,000 USDC"');
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

  it('marks a credit asset as not native XLM when asked', () => {
    const html = renderToStaticMarkup(
      <AmountDisplay amount={42.25} assetCode="EURC" showAssetKind />
    );
    expect(html).toContain('EURC');
    expect(html).toContain('not native XLM');
  });

  it('leaves native XLM unmarked when asset kind labels are shown', () => {
    const html = renderToStaticMarkup(
      <AmountDisplay amount={12.5} assetCode="XLM" showAssetKind />
    );
    expect(html).toContain('XLM');
    expect(html).not.toContain('not native XLM');
  });

  it('renders a negative amount with a visible minus sign', () => {
    const html = renderToStaticMarkup(
      <AmountDisplay amount={-1.5} assetCode="XLM" />
    );
    expect(html).toContain('-1.5');
    expect(html).toContain('aria-label="-1.5 XLM"');
  });
});
