import QRCode from 'qrcode';

/**
 * Generate QR code for payment URL
 */
export const generatePaymentQR = async (paymentUrl: string): Promise<string> => {
  try {
    const qrDataUrl = await QRCode.toDataURL(paymentUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrDataUrl;
  } catch (error) {
    console.error('QR code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * SEP-0007 payment URI encoded in wallet QR codes (not a base64 image).
 */
export const buildStellarPaymentUri = (
  destination: string,
  amount: string,
  assetCode: string = 'XLM',
  memo?: string,
  assetIssuer?: string
): string => {
  let stellarUri = `web+stellar:pay?destination=${destination}&amount=${amount}`;

  if (assetCode !== 'XLM' && assetIssuer) {
    stellarUri += `&asset_code=${assetCode}&asset_issuer=${assetIssuer}`;
  }

  if (memo) {
    stellarUri += `&memo=${encodeURIComponent(memo)}&memo_type=MEMO_TEXT`;
  }

  return stellarUri;
};

/**
 * Generate Stellar payment QR (SEP-0007 format) as a PNG data URL for legacy clients.
 */
export const generateStellarPaymentQR = async (
  destination: string,
  amount: string,
  assetCode: string = 'XLM',
  memo?: string,
  assetIssuer?: string
): Promise<string> => {
  const stellarUri = buildStellarPaymentUri(
    destination,
    amount,
    assetCode,
    memo,
    assetIssuer
  );

  return await QRCode.toDataURL(stellarUri, {
    errorCorrectionLevel: 'H',
    width: 400,
    margin: 1,
  });
};

export default {
  generatePaymentQR,
  buildStellarPaymentUri,
  generateStellarPaymentQR,
};

