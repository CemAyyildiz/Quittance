import { afterEach, describe, expect, it, vi } from 'vitest';

import { server } from '../src/config/stellar';
import stellarService, {
  HorizonUnavailableError,
  UnfundedAccountError,
  sellerAssetReadinessFromBalances,
} from '../src/services/stellar.service';

const USDC = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const OTHER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const seller = 'G' + 'A'.repeat(55);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sellerAssetReadinessFromBalances', () => {
  it('accepts native XLM without any asset balances', () => {
    expect(sellerAssetReadinessFromBalances([], 'XLM').ok).toBe(true);
  });

  it('warns when the seller has no trustline at all', () => {
    const result = sellerAssetReadinessFromBalances(
      [{ asset_type: 'native', asset_code: 'XLM', balance: '10' }],
      'USDC',
      USDC,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('no-trustline');
      expect(result.warning).toContain('USDC');
      expect(result.warning).toContain(USDC);
    }
  });

  it('does not count a trustline for the same code from a different issuer', () => {
    const result = sellerAssetReadinessFromBalances(
      [{ asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: OTHER, balance: '10' }],
      'USDC',
      USDC,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no-trustline');
  });

  it('accepts an exact code + issuer match', () => {
    expect(
      sellerAssetReadinessFromBalances(
        [{ asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: USDC, balance: '10' }],
        'USDC',
        USDC,
      ).ok,
    ).toBe(true);
  });
});

describe('checkSellerAccountForAsset on Horizon', () => {
  it('treats a 404 as an unfunded account (hard error)', async () => {
    vi.spyOn(server, 'loadAccount').mockRejectedValueOnce({ response: { status: 404 } });
    await expect(stellarService.checkSellerAccountForAsset(seller, 'USDC', USDC)).rejects.toBeInstanceOf(
      UnfundedAccountError,
    );
  });

  it('treats a Horizon outage as unavailable (503), creating nothing', async () => {
    vi.spyOn(server, 'loadAccount').mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(stellarService.checkSellerAccountForAsset(seller, 'USDC', USDC)).rejects.toBeInstanceOf(
      HorizonUnavailableError,
    );
  });

  it('loads the account even for native XLM', async () => {
    const load = vi.spyOn(server, 'loadAccount').mockResolvedValueOnce({
      balances: [{ asset_type: 'native', balance: '1' }],
    } as any);
    await expect(stellarService.checkSellerAccountForAsset(seller, 'XLM')).resolves.toEqual({ ok: true });
    expect(load).toHaveBeenCalledWith(seller);
  });
});
