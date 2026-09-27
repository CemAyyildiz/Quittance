import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import NetworkBadge from '../NetworkBadge';

let originalNetwork: string | undefined;

beforeEach(() => {
  originalNetwork = process.env.NEXT_PUBLIC_STELLAR_NETWORK;
  delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
});

afterEach(() => {
  vi.unstubAllEnvs();
  if (originalNetwork === undefined) {
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
  } else {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = originalNetwork;
  }
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

  it('renders TESTNET label when env is unset', () => {
    const html = renderToStaticMarkup(<NetworkBadge />);
    expect(html).toContain('TESTNET');
  });

  it('renders TESTNET label when env is empty', () => {
    vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', '');
    const html = renderToStaticMarkup(<NetworkBadge />);
    expect(html).toContain('TESTNET');
  });

  it('is announced as Network: TESTNET when env is TESTNET', () => {
    vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', 'TESTNET');
    render(<NetworkBadge />);

    expect(screen.getByRole('status', { name: 'Network: TESTNET' })).toBeInTheDocument();
  });

  it('is announced as Network: TESTNET when env is unset', () => {
    render(<NetworkBadge />);

    expect(screen.getByRole('status', { name: 'Network: TESTNET' })).toBeInTheDocument();
  });

  it('is announced as Network: TESTNET when env is empty', () => {
    vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', '');
    render(<NetworkBadge />);

    expect(screen.getByRole('status', { name: 'Network: TESTNET' })).toBeInTheDocument();
  });
});
