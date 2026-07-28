const DISPLAY_NAMES: Record<string, string> = {
  XLM: 'Stellar Lumens',
  USDC: 'USD Coin',
};

export function assetDisplayName(code: string): string {
  const trimmed = code.trim();
  return DISPLAY_NAMES[trimmed] ?? trimmed;
}
