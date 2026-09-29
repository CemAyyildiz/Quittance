import { generatePaymentQR, buildStellarPaymentUri, generateStellarPaymentQR } from '../qrcode';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { toDataURLMock } = vi.hoisted(() => ({
  toDataURLMock: vi.fn<(text: string, options?: unknown) => Promise<string>>(),
}));

vi.mock('qrcode', () => ({
  default: { toDataURL: toDataURLMock },
}));

const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const DESTINATION = 'GDGCCZ6X7X5KG6V3H6LWZ5EVIMICS2QEQPIBS3Z4JVKKR256RUV5DZT';
const ASSET_ISSUER = 'GDTNXRMY2DYAXUCWGPKPPPNSRTCJDYPWWWQAXQVP7AV7KBYZXQ2QYJJY';

beforeEach(() => {
  vi.clearAllMocks();
  toDataURLMock.mockResolvedValue(PNG_DATA_URL);
});

describe('generatePaymentQR', () => {
  it('should generate QR code with correct PNG options', async () => {
    const paymentUrl = 'https://example.com/pay/123';
    const qrDataUrl = await generatePaymentQR(paymentUrl);

    // Should return a PNG data URL
    expect(qrDataUrl).toMatch(/^data:image\/png;base64,/);

    // Lock the options passed to QRCode.toDataURL
    expect(toDataURLMock).toHaveBeenCalledWith(
      paymentUrl,
      expect.objectContaining({ errorCorrectionLevel: 'M', width: 300, margin: 2 }),
    );
  });

  it('should throw error with failure message when QR generation fails', async () => {
    toDataURLMock.mockRejectedValueOnce(new Error('Generation failed'));

    await expect(generatePaymentQR('https://example.com'))
      .rejects
      .toThrow('Failed to generate QR code');
  });
});

describe('buildStellarPaymentUri', () => {
  it('should handle empty memo correctly', () => {
    const uri = buildStellarPaymentUri(
      DESTINATION,
      '100',
      'XLM',
      '', // empty memo
      ASSET_ISSUER
    );

    expect(uri).toContain(`destination=${DESTINATION}`);
    expect(uri).toContain('amount=100');
    // XLM payments carry no asset params, and an empty memo must not add
    // either a memo or a memo_type parameter to the payload.
    expect(uri).not.toContain('asset_code=');
    expect(uri).not.toContain('asset_issuer=');
    expect(uri).not.toContain('memo=');
    expect(uri).not.toContain('memo_type=');
    expect(uri).toBe(`web+stellar:pay?destination=${DESTINATION}&amount=100`);
  });

  it('should include memo when provided', () => {
    const uri = buildStellarPaymentUri(
      DESTINATION,
      '50',
      'XLM',
      'Test memo',
      ASSET_ISSUER
    );

    expect(uri).toContain('memo=Test%20memo');
    expect(uri).toContain('memo_type=MEMO_TEXT');
  });
});

describe('generateStellarPaymentQR', () => {
  it('should generate Stellar payment QR with correct options', async () => {
    const qrDataUrl = await generateStellarPaymentQR(
      DESTINATION,
      '100',
      'XLM',
      'Test memo',
      ASSET_ISSUER
    );

    // Should return a PNG data URL
    expect(qrDataUrl).toMatch(/^data:image\/png;base64,/);

    // Lock the options passed to QRCode.toDataURL
    expect(toDataURLMock).toHaveBeenCalledWith(
      buildStellarPaymentUri(DESTINATION, '100', 'XLM', 'Test memo', ASSET_ISSUER),
      { errorCorrectionLevel: 'H', width: 400, margin: 1 },
    );
  });
});

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
