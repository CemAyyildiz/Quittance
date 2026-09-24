import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props and accessibility attributes', () => {
    const html = renderToStaticMarkup(<LoadingSpinner />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('Loading...');
    expect(html).toContain('sr-only');
  });

  it('renders custom label and supports visually showing the label via showLabel', () => {
    const html = renderToStaticMarkup(
      <LoadingSpinner label="Custom Loading Label" showLabel />
    );
    expect(html).toContain('Custom Loading Label');
    expect(html).not.toContain('sr-only');
  });

  it('renders message prop when provided', () => {
    const html = renderToStaticMarkup(
      <LoadingSpinner message="Fetching data..." />
    );
    expect(html).toContain('Fetching data...');
    expect(html).not.toContain('sr-only');
  });

  it('supports hideLabel prop to keep label screen-reader only', () => {
    const html = renderToStaticMarkup(
      <LoadingSpinner label="Secret Loading" hideLabel={true} />
    );
    expect(html).toContain('Secret Loading');
    expect(html).toContain('sr-only');
  });

  it('forwards custom className and data-testid props', () => {
    const html = renderToStaticMarkup(
      <LoadingSpinner className="my-custom-spinner" data-testid="custom-spinner" />
    );
    expect(html).toContain('my-custom-spinner');
    expect(html).toContain('data-testid="custom-spinner"');
  });

  it('renders size variants correctly', () => {
    const smallHtml = renderToStaticMarkup(<LoadingSpinner size="small" />);
    expect(smallHtml).toContain('gap-1.5');

    const mediumHtml = renderToStaticMarkup(<LoadingSpinner size="medium" />);
    expect(mediumHtml).toContain('gap-2');

    const largeHtml = renderToStaticMarkup(<LoadingSpinner size="large" />);
    expect(largeHtml).toContain('gap-3');

    const numericHtml = renderToStaticMarkup(<LoadingSpinner size={40} />);
    expect(numericHtml).toContain('width="40"');
  });

  it('renders color variants correctly', () => {
    const primaryHtml = renderToStaticMarkup(<LoadingSpinner variant="primary" />);
    expect(primaryHtml).toContain('text-cyan-600');

    const mutedHtml = renderToStaticMarkup(<LoadingSpinner variant="muted" />);
    expect(mutedHtml).toContain('text-[var(--muted)]');
  });
});
