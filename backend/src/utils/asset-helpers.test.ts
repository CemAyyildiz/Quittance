/**
 * asset-helpers.test.ts
 *
 * Tests for Horizon asset normalization helpers.
 */

import { describe, it, expect } from 'vitest';
import {
  assetTypeToCode,
  isNativeAsset,
  isCreditAsset,
  NATIVE_ASSET_CODE,
  NATIVE_ASSET_TYPE,
  CREDIT_ASSET_TYPES,
  UNKNOWN_ASSET_CODE,
} from './asset-helpers';

// ---------------------------------------------------------------------------
// assetTypeToCode
// ---------------------------------------------------------------------------
describe('assetTypeToCode', () => {
  describe('native XLM', () => {
    it('maps horizon native type to XLM', () => {
      expect(assetTypeToCode({ asset_type: 'native' })).toBe('XLM');
    });

    it('maps native type with empty asset_code to XLM', () => {
      expect(assetTypeToCode({ asset_type: 'native', asset_code: '' })).toBe('XLM');
    });
  });

  describe('credit assets', () => {
    it('maps USDC credit_alphanum4 to USDC', () => {
      expect(
        assetTypeToCode({ asset_type: 'credit_alphanum4', asset_code: 'USDC' })
      ).toBe('USDC');
    });

    it('maps credit_alphanum12 to its asset code', () => {
      expect(
        assetTypeToCode({ asset_type: 'credit_alphanum12', asset_code: 'LONGASSETCODE' })
      ).toBe('LONGASSETCODE');
    });

    it('falls back to UNKNOWN when credit asset has no asset_code', () => {
      expect(assetTypeToCode({ asset_type: 'credit_alphanum4' })).toBe('UNKNOWN');
      expect(assetTypeToCode({ asset_type: 'credit_alphanum12' })).toBe('UNKNOWN');
    });
  });
});

// ---------------------------------------------------------------------------
// isNativeAsset
// ---------------------------------------------------------------------------
describe('isNativeAsset', () => {
  it('matches native asset type', () => {
    expect(isNativeAsset({ asset_type: NATIVE_ASSET_TYPE })).toBe(true);
  });

  it('matches XLM asset code', () => {
    expect(isNativeAsset({ asset_type: 'credit_alphanum4', asset_code: NATIVE_ASSET_CODE })).toBe(
      true
    );
  });

  it('rejects credit asset', () => {
    expect(isNativeAsset({ asset_type: 'credit_alphanum4', asset_code: 'USDC' })).toBe(false);
  });

  it('rejects unknown/empty input', () => {
    expect(isNativeAsset({})).toBe(false);
    expect(isNativeAsset({ asset_type: null, asset_code: null })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isCreditAsset
// ---------------------------------------------------------------------------
describe('isCreditAsset', () => {
  it('matches credit_alphanum4', () => {
    expect(isCreditAsset({ asset_type: CREDIT_ASSET_TYPES[0] })).toBe(true);
  });

  it('matches credit_alphanum12', () => {
    expect(isCreditAsset({ asset_type: CREDIT_ASSET_TYPES[1] })).toBe(true);
  });

  it('includes both credit asset types', () => {
    expect(CREDIT_ASSET_TYPES).toEqual(['credit_alphanum4', 'credit_alphanum12']);
  });

  it('rejects native asset', () => {
    expect(isCreditAsset({ asset_type: 'native' })).toBe(false);
  });

  it('rejects unknown/empty input', () => {
    expect(isCreditAsset({})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe('constants', () => {
  it('native constants align', () => {
    expect(NATIVE_ASSET_CODE).toBe('XLM');
    expect(NATIVE_ASSET_TYPE).toBe('native');
  });

  it('UNKNOWN fallback is exported', () => {
    expect(UNKNOWN_ASSET_CODE).toBe('UNKNOWN');
  });
});