import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../../config/stellar', () => ({
  server: {},
  NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
  getSellerKeypair: vi.fn(),
  STELLAR_HORIZON_URL: 'https://horizon-testnet.example',
}));

import stellarService from '../stellar.service';

describe('StellarService.checkHorizonHealth', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns latest ledger when Horizon root answers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ history_latest_ledger: 987654 }),
      })
    );

    const result = await stellarService.checkHorizonHealth(500);

    expect(result).toEqual({ reachable: true, latestLedger: 987654 });
    expect(fetch).toHaveBeenCalledWith(
      'https://horizon-testnet.example/',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('returns unreachable when Horizon is slow past the timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) {
            return;
          }
          if (signal.aborted) {
            reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
            return;
          }
          signal.addEventListener('abort', () => {
            reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
          });
        });
      })
    );

    const result = await stellarService.checkHorizonHealth(40);

    expect(result).toEqual({ reachable: false });
  });

  it('returns unreachable on non-OK Horizon response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({}),
      })
    );

    const result = await stellarService.checkHorizonHealth(500);

    expect(result).toEqual({ reachable: false });
  });
});
