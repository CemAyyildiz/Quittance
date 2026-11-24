import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadAccount = vi.hoisted(() => vi.fn());

vi.mock('./stellar', () => ({
  server: { loadAccount },
}));

import { loadAssetIssuerDomain } from './stellarToml';

const issuer = 'GABC';
const domain = 'issuer.example';

describe('loadAssetIssuerDomain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadAccount.mockResolvedValue({ home_domain: domain });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          `[[CURRENCIES]]\ncode="USDC"\nissuer="${issuer}"`,
      })
    );
  });

  it('returns the home domain for a matching currency and issuer', async () => {
    await expect(loadAssetIssuerDomain('USDC', issuer)).resolves.toBe(domain);
    expect(loadAccount).toHaveBeenCalledWith(issuer);
    expect(fetch).toHaveBeenCalledWith(
      `https://${domain}/.well-known/stellar.toml`,
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('does not return a domain when the currency issuer does not match', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () =>
        `[[CURRENCIES]]\ncode="USDC"\nissuer="GOTHER"`,
    } as Response);

    await expect(loadAssetIssuerDomain('USDC', issuer)).resolves.toBeNull();
  });

  it('rejects native XLM without loading an issuer account or toml', async () => {
    await expect(loadAssetIssuerDomain('XLM', '')).resolves.toBeNull();
    expect(loadAccount).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('propagates fetch failures so the caller can keep rendering the invoice', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network unavailable'));

    await expect(loadAssetIssuerDomain('USDC', issuer)).rejects.toThrow(
      'Network unavailable'
    );
  });
});
