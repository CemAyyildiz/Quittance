import { generatePaymentQR, buildStellarPaymentUri, generateStellarPaymentQR } from '../qrcode';

describe('generatePaymentQR', () => {
  it('should generate QR code with correct PNG options', async () => {
    const paymentUrl = 'https://example.com/pay/123';
    const qrDataUrl = await generatePaymentQR(paymentUrl);

    // Should return a data URL
    expect(qrDataUrl).toBeTruthy();
    expect(qrDataUrl).toStartWith('data:image/png;base64,');
  });

  it('should throw error with failure message when QR generation fails', async () => {
    // Mock QRCode.toDataURL to throw an error
    const originalToDataURL = require('qrcode').default.toDataURL;
    // @ts-expect-error - we're mocking for test
    require('qrcode').default.toDataURL = jest.fn().mockRejectedValue(new Error('Generation failed'));

    await expect(generatePaymentQR('https://example.com'))
      .rejects
      .toThrow('Failed to generate QR code');

    // Restore original function
    // @ts-expect-error - we're mocking for test
    require('qrcode').default.toDataURL = originalToDataURL;
  });
});

describe('buildStellarPaymentUri', () => {
  it('should handle empty memo correctly', () => {
    const uri = buildStellarPaymentUri(
      'GDGCCZ6X7X5KG6V3H6LWZ5EVIMICS2QEQPIBSG3Z4JVKKR256RUV5DZT',
      '100',
      'XLM',
      '', // empty memo
      'GDTNXRMY2DYAXUCWGPKPPPNSRTCJDYPWWWQAXQVP7AV7KBYZXQ2QYJJY'
    );

    expect(uri).toContain('destination=GDGCCZ6X7X5KG6V3H6LWZ5EVIMICS2QEQPIBS3Z4JVKKR256RUV5DZT');
    expect(uri).toContain('amount=100');
    expect(uri).toContain('asset_code=XLM');
    expect(uri).toContain('asset_issuer=GDTNXRMY2DYAXUCWGPKPPPNSRTCJDYPWWWQAXQVP7AV7KBYZXQ2QYJJY');
    // Should not include memo parameter when memo is empty
    expect(uri).not.toContain('&memo=');
  });

  it('should include memo when provided', () => {
    const uri = buildStellarPaymentUri(
      'GDGCCZ6X7X5KG6V3H6LWZ5EVIMICS2QEQPIBS3Z4JVKKR256RUV5DZT',
      '50',
      'XLM',
      'Test memo',
      'GDTNXRMY2DYAXUCWGPKPPPNSRTCJDYPWWWQAXQVP7AV7KBYZXQ2QYJJY'
    );

    expect(uri).toContain('memo=Test+memo');
    expect(uri).toContain('memo_type=MEMO_TEXT');
  });
});

describe('generateStellarPaymentQR', () => {
  it('should generate Stellar payment QR with correct options', async () => {
    const qrDataUrl = await generateStellarPaymentQR(
      'GDGCCZ6X7X5KG6V3H6LWZ5EVIMICS2QEQPIBS3Z4JVKKR256RUV5DZT',
      '100',
      'XLM',
      'Test memo',
      'GDTNXRMY2DYAXUCWGPKPPPNSRTCJDYPWWWQAXQVP7AV7KBYZXQ2QYJJY'
    );

    // Should return a data URL
    expect(qrDataUrl).toBeTruthy();
    expect(qrDataUrl).toStartWith('data:image/png;base64,');
  });
});