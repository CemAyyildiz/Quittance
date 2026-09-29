import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { buildStellarPaymentUri, generatePaymentQR, generateStellarPaymentQR } from '../qrcode';

// Mock the QRCode module
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn()
  }
}));

import QRCode from 'qrcode';

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

  it('omits memo and memo_type when memo is empty string', () => {
    const uri = buildStellarPaymentUri(DEST, '10', 'XLM', '');
    expect(uri).toBe(
      `web+stellar:pay?destination=${DEST}&amount=10`,
    );
  });

  it('omits memo and memo_type when memo is null', () => {
    const uri = buildStellarPaymentUri(DEST, '10', 'XLM', null as unknown as string);
    expect(uri).toBe(
      `web+stellar:pay?destination=${DEST}&amount=10`,
    );
  });

  it('omits memo and memo_type when memo is undefined', () => {
    const uri = buildStellarPaymentUri(DEST, '10', 'XLM', undefined);
    expect(uri).toBe(
      `web+stellar:pay?destination=${DEST}&amount=10`,
    );
  });
});

describe('generatePaymentQR', () => {
  const paymentUrl = 'web+stellar:pay?destination=GDC...&amount=10';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls QRCode.toDataURL with correct options for payment QR', async () => {
    const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...';
    (QRCode.toDataURL as Mock).mockResolvedValue(mockDataUrl);

    await generatePaymentQR(paymentUrl);

    expect(QRCode.toDataURL).toHaveBeenCalledWith(paymentUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  });

  it('throws error when QRCode.toDataURL fails', async () => {
    const errorMessage = 'QR generation failed';
    (QRCode.toDataURL as Mock).mockRejectedValue(new Error(errorMessage));

    await expect(generatePaymentQR(paymentUrl)).rejects.toThrow('Failed to generate QR code');
  });
});

describe('generateStellarPaymentQR', () => {
  const destination = 'GA5ZSEJ62SP2X5TSEJD7H4K7RWHPGZKFJXKKB2MM54FHT3MS5LZ4CODE';
  const amount = '100.5';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls QRCode.toDataURL with correct options for Stellar payment QR', async () => {
    const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...';
    (QRCode.toDataURL as Mock).mockResolvedValue(mockDataUrl);

    await generateStellarPaymentQR(destination, amount);

    expect(QRCode.toDataURL).toHaveBeenCalled();
    const callArgs = (QRCode.toDataURL as Mock).mock.calls[0];
    expect(callArgs[0]).toContain('web+stellar:pay');
    expect(callArgs[1]).toMatchObject({
      errorCorrectionLevel: 'H',
      width: 400,
      margin: 1
    });
  });

  it('includes memo in URI when provided', async () => {
    const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...';
    (QRCode.toDataURL as Mock).mockResolvedValue(mockDataUrl);
    const memo = 'Test memo';

    await generateStellarPaymentQR(destination, amount, 'XLM', memo);

    const callArgs = (QRCode.toDataURL as Mock).mock.calls[0];
    expect(callArgs[0]).toContain(`memo=${encodeURIComponent(memo)}`);
    expect(callArgs[0]).toContain('memo_type=MEMO_TEXT');
  });

  it('omits memo from URI when memo is empty string', async () => {
    const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...';
    (QRCode.toDataURL as Mock).mockResolvedValue(mockDataUrl);

    await generateStellarPaymentQR(destination, amount, 'XLM', '');

    const callArgs = (QRCode.toDataURL as Mock).mock.calls[0];
    expect(callArgs[0]).not.toContain('memo=');
    expect(callArgs[0]).not.toContain('memo_type=');
  });
});