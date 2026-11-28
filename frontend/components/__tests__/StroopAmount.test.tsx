import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StroopAmount from '../StroopAmount';

describe('StroopAmount', () => {
  it('renders 1.5 as 15000000 stroops', () => {
    const html = renderToStaticMarkup(<StroopAmount amount={1.5} />);
    expect(html).toContain('15000000');
    expect(html).toContain('stroops');
  });

  it('derives the stroop total from a stored string amount', () => {
    expect(renderToStaticMarkup(<StroopAmount amount="1.5000000" />)).toContain('15000000');
    expect(renderToStaticMarkup(<StroopAmount amount="0.0000001" />)).toContain('>1<');
  });

  it('shows a one-stroop difference', () => {
    expect(renderToStaticMarkup(<StroopAmount amount="1.5000001" />)).toContain('15000001');
  });

  it.each([-1.5, '-1', 0, '1.00000001', 'abc', null, undefined])(
    'renders nothing for %s instead of a zero total',
    (amount) => {
      expect(renderToStaticMarkup(<StroopAmount amount={amount as never} />)).toBe('');
    },
  );
});
