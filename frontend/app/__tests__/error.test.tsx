import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ErrorPage from '../error';

function render() {
  return renderToStaticMarkup(<ErrorPage error={new Error('boom')} reset={() => {}} />);
}

describe('ErrorPage', () => {
  it('announces the error heading and description via role="alert"', () => {
    const html = render();
    const alert = html.match(/<div role="alert">([\s\S]*?)<\/div>/);

    expect(alert).not.toBeNull();
    expect(alert![1]).toContain('Something went wrong');
    expect(alert![1]).toContain('We could not load this page.');
    expect(alert![1]).toContain('Try loading it again.');
  });

  it('keeps the recovery actions outside the alert region', () => {
    const html = render();
    const alert = html.match(/<div role="alert">([\s\S]*?)<\/div>/);

    expect(alert![1]).not.toContain('Try again');
    expect(alert![1]).not.toContain('Go to home');
    expect(html).toContain('Try again');
    expect(html).toContain('Go to home');
    expect(html).toContain('href="/"');
  });
});
