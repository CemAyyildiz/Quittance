import { describe, it, expect } from 'vitest';
import { buildStellarPaymentUri } from './stellar-payment-uri';

const DESTINATION = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKL';
const USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

describe('buildStellarPaymentUri', () => {
  // ── XLM (native asset) ─────────────────────────────────────

  it('builds a minimal XLM payment URI with destination and amount', () => {
    expect(buildStellarPaymentUri(DESTINATION, '10')).toBe(
      `web+stellar:pay?destination=${DESTINATION}&amount=10`,
    );
  });

  it('keeps the scheme and base path as web+stellar:pay', () => {
    const uri = buildStellarPaymentUri(DESTINATION, '1');
    expect(uri.startsWith('web+stellar:pay?')).toBe(true);
  });

  it('omits asset params when assetCode defaults to XLM', () => {
    const uri = buildStellarPaymentUri(DESTINATION, '5');
    expect(uri).not.toContain('asset_code');
    expect(uri).not.toContain('asset_issuer');
  });

  it('omits asset params when assetCode is XLM even if an issuer is passed', () => {
    const uri = buildStellarPaymentUri(DESTINATION, '2', 'XLM', undefined, USDC_ISSUER);
    expect(uri).toBe(`web+stellar:pay?destination=${DESTINATION}&amount=2`);
  });

  it('passes through the explicit XLM assetCode without asset params', () => {
    expect(buildStellarPaymentUri(DESTINATION, '7', 'XLM')).toBe(
      `web+stellar:pay?destination=${DESTINATION}&amount=7`,
    );
  });

  // ── USDC + issuer (non-native asset) ───────────────────────

  it('appends asset_code and asset_issuer for a non-native asset', () => {
    const uri = buildStellarPaymentUri(DESTINATION, '25', 'USDC', undefined, USDC_ISSUER);
    expect(uri).toBe(
      `web+stellar:pay?destination=${DESTINATION}&amount=25&asset_code=USDC&asset_issuer=${USDC_ISSUER}`,
    );
  });

  it('omits asset params when assetCode is non-native but no issuer is provided', () => {
    const uri = buildStellarPaymentUri(DESTINATION, '3', 'USDC');
    expect(uri).toBe(`web+stellar:pay?destination=${DESTINATION}&amount=3`);
  });

  // ── Memo encoding ──────────────────────────────────────────

  it('appends memo and memo_type when a memo is provided', () => {
    const uri = buildStellarPaymentUri(DESTINATION, '1', 'XLM', 'INV-2026');
    expect(uri).toBe(
      `web+stellar:pay?destination=${DESTINATION}&amount=1&memo=INV-2026&memo_type=MEMO_TEXT`,
    );
  });

  it('URL-encodes a memo with spaces', () => {
    const uri = buildStellarPaymentUri(DESTINATION, '1', 'XLM', 'thanks for the coffee');
    expect(uri).toContain('&memo=thanks%20for%20the%20coffee&memo_type=MEMO_TEXT');
  });

  it('URL-encodes a memo with reserved characters', () => {
    const uri = buildStellarPaymentUri(DESTINATION, '1', 'XLM', 'a&b=c?d/e');
    expect(uri).toContain('&memo=a%26b%3Dc%3Fd%2Fe&memo_type=MEMO_TEXT');
  });

  it('URL-encodes a memo with non-ASCII characters', () => {
    const uri = buildStellarPaymentUri(DESTINATION, '1', 'XLM', 'café ☕');
    expect(uri).toContain('&memo=caf%C3%A9%20%E2%98%95&memo_type=MEMO_TEXT');
  });

  it('omits memo params when memo is empty', () => {
    const uri = buildStellarPaymentUri(DESTINATION, '1', 'XLM', '');
    expect(uri).toBe(`web+stellar:pay?destination=${DESTINATION}&amount=1`);
  });

  // ── Combined: USDC + issuer + memo ─────────────────────────

  it('builds a full USDC payment URI with issuer and encoded memo', () => {
    const uri = buildStellarPaymentUri(
      DESTINATION,
      '42.5',
      'USDC',
      'order #123',
      USDC_ISSUER,
    );
    expect(uri).toBe(
      `web+stellar:pay?destination=${DESTINATION}&amount=42.5&asset_code=USDC&asset_issuer=${USDC_ISSUER}&memo=order%20%23123&memo_type=MEMO_TEXT`,
    );
  });
});
