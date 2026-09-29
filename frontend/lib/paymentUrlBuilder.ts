export function paymentUrlBuilder(origin: string, id: string): string {
  const base = origin.replace(/\/+$/, '');
  const cleanId = id.trim();

  if (!base) {
    throw new Error('Origin is required');
  }
  if (!cleanId) {
    throw new Error('Payment ID is required');
  }

  return `${base}/pay/${encodeURIComponent(cleanId)}`;
}
