import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ErrorPage from '../error';

function render(options: { message?: string; digest?: string } = {}) {
  const { message = 'boom', digest } = options;
  const error: Error & { digest?: string } = new Error(message);
  if (digest) error.digest = digest;

  return renderToStaticMarkup(<ErrorPage error={error} reset={() => {}} />);
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

  it('never renders the exception message or digest, keeping the recovery path intact', () => {
    const message = 'pg-pool-exhausted-9f2c';
    const digest = 'digest-4b81c0de';
    const html = render({ message, digest });

    // The message and digest are logged in the effect, never painted on the page.
    expect(html).not.toContain(message);
    expect(html).not.toContain(digest);

    // The user-facing copy and the recovery controls must stay in place.
    expect(html).toContain('Something went wrong');
    expect(html).toContain('We could not load this page.');
    expect(html).toContain('Try again');
    expect(html).toContain('Go to home');
    expect(html).toContain('href="/"');
  });
});
