import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import NetworkBadge from '../NetworkBadge';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('NetworkBadge', () => {
  it('renders TESTNET label when env is TESTNET', () => {
    vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', 'TESTNET');
    const html = renderToStaticMarkup(<NetworkBadge />);
    expect(html).toContain('TESTNET');
  });

  it('returns null when env is public', () => {
    vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', 'PUBLIC');
    const html = renderToStaticMarkup(<NetworkBadge />);
    expect(html).toBe('');
  });
});
