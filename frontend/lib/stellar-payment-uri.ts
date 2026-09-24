/**
 * SEP-0007 payment URI for wallet QR codes and clipboard share (never base64).
 */
export function buildStellarPaymentUri(
  destination: string,
  amount: string,
  assetCode: string = 'XLM',
  memo?: string,
  assetIssuer?: string
): string {
  let stellarUri = `web+stellar:pay?destination=${destination}&amount=${amount}`;

  if (assetCode !== 'XLM' && assetIssuer) {
    stellarUri += `&asset_code=${assetCode}&asset_issuer=${assetIssuer}`;
  }

  if (memo) {
    stellarUri += `&memo=${encodeURIComponent(memo)}&memo_type=MEMO_TEXT`;
  }

  return stellarUri;
}
