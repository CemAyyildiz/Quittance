/**
 * Map a Stellar asset code to a human-readable display name.
 *
 * The MVP flow quotes asset codes exactly as the issuer publishes them
 * ("XLM", "USDC", custom 4-12 character codes), which is fine inside a
 * Node SDK call but reads awkwardly in a UI badge or pay-page header
 * ("USDC" → "USD Coin" looks better than just "USDC").
 *
 * Recognised mappings (case-sensitive, surrounding whitespace ignored):
 *
 *   XLM    -> "Stellar Lumens"
 *   USDC   -> "USD Coin"
 *
 * Branches:
 *
 * - Unknown code (e.g. "BTC", "USDT") -> the **trimmed input**, unchanged.
 *   This preserves the original issuer ticker so unfamiliar assets are
 *   never silently rewritten into a wrong human-readable name.
 * - `null`, `undefined`, empty string, whitespace-only string -> `""`.
 *   This is a defensive branch for JSON-shaped invoice payloads where
 *   a missing asset code can materialise as `null`. The widening from
 *   `string` to `string | null | undefined` exists solely for that
 *   JSON-defensive caller shape.
 *
 * @example
 *   assetDisplayName('XLM')    // => "Stellar Lumens"
 *   assetDisplayName('USDC')   // => "USD Coin"
 *   assetDisplayName(' BTC ')  // => "BTC"
 *   assetDisplayName('xlm')    // => "xlm"        (case-sensitive)
 *   assetDisplayName(null)     // => ""
 *   assetDisplayName(undefined)// => ""
 */
const DISPLAY_NAMES: Record<string, string> = {
  XLM: 'Stellar Lumens',
  USDC: 'USD Coin',
};

export function assetDisplayName(code: string | null | undefined): string {
  if (code === null || code === undefined) {
    return '';
  }
  const trimmed = code.trim();
  return DISPLAY_NAMES[trimmed] ?? trimmed;
}
