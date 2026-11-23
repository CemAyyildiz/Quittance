// Stellar Asset Configuration
export interface StellarAsset {
  code: string;
  name: string;
  issuer?: string;
  logo: string;
  color: string;
  decimals: number;
}

// Testnet Asset Issuers
export const STELLAR_ASSETS: StellarAsset[] = [
  {
    code: 'XLM',
    name: 'Stellar Lumens',
    logo: 'https://assets.coingecko.com/coins/images/100/small/stellar-xlm-logo.png',
    color: '#14b6e7',
    decimals: 7,
  },
  {
    code: 'USDC',
    name: 'USD Coin',
    issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', // Testnet USDC
    logo: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
    color: '#2775ca',
    decimals: 7,
  },
  {
    code: 'USDT',
    name: 'Tether USD',
    issuer: 'GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V', // Testnet USDT
    logo: 'https://assets.coingecko.com/coins/images/325/small/tether.png',
    color: '#26a17b',
    decimals: 7,
  },
];

// Get asset by code
export const getAssetByCode = (code: string): StellarAsset | undefined => {
  return STELLAR_ASSETS.find((asset) => asset.code === code);
};

export const hasAssetTrustline = (
  balances: Array<{ asset_code?: string; asset_issuer?: string }>,
  code: string,
  issuer: string,
): boolean =>
  balances.some((balance) => balance.asset_code === code && balance.asset_issuer === issuer);

// Format asset display name
export const formatAssetName = (code: string): string => {
  const asset = getAssetByCode(code);
  return asset ? asset.code : code;
};

// Asset Logo Component Props
export interface AssetLogoProps {
  code: string;
  size?: number;
  showName?: boolean;
  className?: string;
}
