/**
 * asset-helpers.ts
 *
 * Pure helpers that map a Horizon asset (its `asset_type` and `asset_code`)
 * to the invoice asset code Quittance uses (e.g. `XLM`, `USDC`).
 *
 * Horizon distinguishes native lumens (`asset_type === 'native'`, which it
 * exposes only as `XLM`) from issued credit assets (`credit_alphanum4` /
 * `credit_alphanum12`, keyed by their `asset_code`). These helpers centralise
 * that mapping so callers no longer have to inline
 * `asset_type === 'native' ? 'XLM' : asset_code` at every usage site.
 */

export const NATIVE_ASSET_TYPE = 'native';
export const NATIVE_ASSET_CODE = 'XLM';

export const CREDIT_ASSET_TYPES = ['credit_alphanum4', 'credit_alphanum12'] as const;

// The code used on invoices when a credit asset record has no asset_code.
export const UNKNOWN_ASSET_CODE = 'UNKNOWN';

export type HorizonAssetType = typeof NATIVE_ASSET_TYPE | (typeof CREDIT_ASSET_TYPES)[number];

export interface HorizonAssetLike {
  asset_type?: string | null;
  asset_code?: string | null;
}

/**
 * Map a Horizon asset record to the invoice asset code.
 *
 * - Native lumens map to `XLM`.
 * - Credit (issued) assets map to their `asset_code` (e.g. `USDC`).
 * - A credit asset without an `asset_code` falls back to `UNKNOWN_ASSET_CODE`.
 */
export function assetTypeToCode(asset: HorizonAssetLike): string {
  if (isNativeAsset(asset)) {
    return NATIVE_ASSET_CODE;
  }
  return asset.asset_code ?? UNKNOWN_ASSET_CODE;
}

/**
 * Returns true when the Horizon asset record represents native lumens (XLM),
 * either via the `native` asset type or the invoice `XLM` asset code.
 */
export function isNativeAsset(asset: HorizonAssetLike): boolean {
  return asset.asset_type === NATIVE_ASSET_TYPE || asset.asset_code === NATIVE_ASSET_CODE;
}

/**
 * Returns true when the Horizon asset record is a credit asset
 * (`credit_alphanum4` / `credit_alphanum12`).
 */
export function isCreditAsset(asset: HorizonAssetLike): boolean {
  return CREDIT_ASSET_TYPES.includes(asset.asset_type as (typeof CREDIT_ASSET_TYPES)[number]);
}