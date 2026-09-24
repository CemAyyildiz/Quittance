import { describe, it, expect } from 'vitest';
import {
  STELLAR_ASSETS,
  getAssetByCode,
  formatAssetName,
  type StellarAsset,
} from './assets';

describe('STELLAR_ASSETS registry', () => {
  it('contains XLM entry', () => {
    const xlm = STELLAR_ASSETS.find((a) => a.code === 'XLM');
    expect(xlm).toBeDefined();
    expect(xlm!.name).toBe('Stellar Lumens');
    expect(xlm!.decimals).toBe(7);
    expect(xlm!.issuer).toBeUndefined();
  });

  it('contains USDC entry', () => {
    const usdc = STELLAR_ASSETS.find((a) => a.code === 'USDC');
    expect(usdc).toBeDefined();
    expect(usdc!.name).toBe('USD Coin');
    expect(usdc!.issuer).toBe(
      'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    );
    expect(usdc!.decimals).toBe(7);
  });

  it('contains USDT entry', () => {
    const usdt = STELLAR_ASSETS.find((a) => a.code === 'USDT');
    expect(usdt).toBeDefined();
    expect(usdt!.name).toBe('Tether USD');
    expect(usdt!.issuer).toBe(
      'GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V',
    );
    expect(usdt!.decimals).toBe(7);
  });

  it('has exactly 3 assets', () => {
    expect(STELLAR_ASSETS).toHaveLength(3);
  });

  it('every asset has required fields', () => {
    for (const asset of STELLAR_ASSETS) {
      expect(asset.code).toBeTruthy();
      expect(asset.name).toBeTruthy();
      expect(asset.logo).toBeTruthy();
      expect(asset.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(asset.decimals).toBeGreaterThan(0);
    }
  });
});

describe('getAssetByCode', () => {
  it('returns XLM asset for "XLM"', () => {
    const asset = getAssetByCode('XLM');
    expect(asset).toBeDefined();
    expect(asset!.code).toBe('XLM');
    expect(asset!.name).toBe('Stellar Lumens');
  });

  it('returns USDC asset for "USDC"', () => {
    const asset = getAssetByCode('USDC');
    expect(asset).toBeDefined();
    expect(asset!.code).toBe('USDC');
    expect(asset!.name).toBe('USD Coin');
  });

  it('returns USDT asset for "USDT"', () => {
    const asset = getAssetByCode('USDT');
    expect(asset).toBeDefined();
    expect(asset!.code).toBe('USDT');
    expect(asset!.name).toBe('Tether USD');
  });

  it('returns undefined for unknown asset code', () => {
    const asset = getAssetByCode('BTC');
    expect(asset).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    const asset = getAssetByCode('');
    expect(asset).toBeUndefined();
  });

  it('is case-sensitive ("xlm" does not match "XLM")', () => {
    const asset = getAssetByCode('xlm');
    expect(asset).toBeUndefined();
  });
});

describe('formatAssetName', () => {
  it('returns asset code for known asset', () => {
    expect(formatAssetName('XLM')).toBe('XLM');
    expect(formatAssetName('USDC')).toBe('USDC');
  });

  it('returns the input code unchanged for unknown asset', () => {
    expect(formatAssetName('BTC')).toBe('BTC');
    expect(formatAssetName('DOGE')).toBe('DOGE');
  });
});
