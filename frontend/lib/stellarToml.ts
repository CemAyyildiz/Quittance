import { server } from './stellar';

const hasMatchingCurrency = (
  toml: string,
  assetCode: string,
  issuer: string
): boolean =>
  toml.split('[[CURRENCIES]]').slice(1).some((currency) => {
    const code = currency.match(/^\s*code\s*=\s*"([^"]+)"\s*(?:#.*)?$/m)?.[1];
    const currencyIssuer = currency.match(
      /^\s*issuer\s*=\s*"([^"]+)"\s*(?:#.*)?$/m
    )?.[1];
    return code === assetCode && currencyIssuer === issuer;
  });

export const loadAssetIssuerDomain = async (
  assetCode: string,
  issuer: string
): Promise<string | null> => {
  if (assetCode === 'XLM' || !issuer) {
    return null;
  }

  const account = await server.loadAccount(issuer);
  const domain = account.home_domain?.trim();
  if (!domain || !/^[a-z0-9.-]+$/i.test(domain)) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`https://${domain}/.well-known/stellar.toml`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Failed to load stellar.toml (${response.status})`);
    }

    const toml = await response.text();
    return hasMatchingCurrency(toml, assetCode, issuer) ? domain : null;
  } finally {
    clearTimeout(timeout);
  }
};
