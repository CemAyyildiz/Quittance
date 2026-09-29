import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import NotFound from '../not-found';

describe('NotFound', () => {
  it('keeps the home recovery link', () => {
    const html = renderToStaticMarkup(<NotFound />);
    expect(html).toContain('href="/"');
    expect(html).toContain('Go to home');
  });

  it('offers a secondary dashboard recovery link', () => {
    const html = renderToStaticMarkup(<NotFound />);
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('Go to dashboard');
  });

  it('keeps the 404 heading and copy', () => {
    const html = renderToStaticMarkup(<NotFound />);
    expect(html).toContain('Error 404');
    expect(html).toContain('This page could not be found.');
  });

  it('keeps the recovery sentence and header brand', () => {
    const html = renderToStaticMarkup(<NotFound />);
    expect(html).toContain(
      'The link may be incorrect or the page may have moved. Return to Quittance to create or manage your invoices.'
    );
    expect(html).toContain('>Quittance</a>');
  });
});
