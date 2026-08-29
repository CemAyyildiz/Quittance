import { describe, it, expect } from 'vitest';
import { buildStellarPaymentUri } from '../qrcode';

describe('buildStellarPaymentUri', () => {
  const DEST = 'GA5ZSEJ62SP2X5TSEJD7H4K7RWHPGZKFJXKKB2MM54FHT3MS5LZ4CODE';

  it('builds a native XLM payment URI', () => {
    const uri = buildStellarPaymentUri(DEST, '100.5');
    expect(uri).toBe(
      `web+stellar:pay?destination=${DEST}&amount=100.5`,
    );
  });

  it('includes asset_code and asset_issuer for credit assets', () => {
    const issuer = 'GDRRIS6OAOVMDEN6SAXNSIVAA5PLH4MBX77Y4MOE7QYGO3K2DQII7CIB';
    const uri = buildStellarPaymentUri(DEST, '50', 'USDC', undefined, issuer);
    expect(uri).toBe(
      `web+stellar:pay?destination=${DEST}&amount=50&asset_code=USDC&asset_issuer=${issuer}`,
    );
  });

  it('appends a memo with memo_type MEMO_TEXT', () => {
    const uri = buildStellarPaymentUri(DEST, '10', 'XLM', 'hello world');
    expect(uri).toBe(
      `web+stellar:pay?destination=${DEST}&amount=10&memo=hello%20world&memo_type=MEMO_TEXT`,
    );
  });

  it('URL-encodes special characters in the memo', () => {
    const uri = buildStellarPaymentUri(DEST, '1', 'XLM', 'foo&bar=baz?qux');
    expect(uri).toBe(
      `web+stellar:pay?destination=${DEST}&amount=1&memo=foo%26bar%3Dbaz%3Fqux&memo_type=MEMO_TEXT`,
    );
  });

  it('omits asset fields when asset_code is XLM even if issuer is provided', () => {
    const issuer = 'GDRRIS6OAOVMDEN6SAXNSIVAA5PLH4MBX77Y4MOE7QYGO3K2DQII7CIB';
    const uri = buildStellarPaymentUri(DEST, '5', 'XLM', undefined, issuer);
    expect(uri).toBe(
      `web+stellar:pay?destination=${DEST}&amount=5`,
    );
  });

  it('includes credit asset fields alongside a memo', () => {
    const issuer = 'GDRRIS6OAOVMDEN6SAXNSIVAA5PLH4MBX77Y4MOE7QYGO3K2DQII7CIB';
    const uri = buildStellarPaymentUri(DEST, '200', 'BTC', 'invoice #42', issuer);
    expect(uri).toBe(
      `web+stellar:pay?destination=${DEST}&amount=200&asset_code=BTC&asset_issuer=${issuer}&memo=invoice%20%2342&memo_type=MEMO_TEXT`,
    );
  });

  it('defaults assetCode to XLM when omitted', () => {
    const uri = buildStellarPaymentUri(DEST, '7');
    expect(uri).toBe(
      `web+stellar:pay?destination=${DEST}&amount=7`,
    );
  });
});
