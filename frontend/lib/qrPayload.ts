export function isBase64DataUrl(value: string): boolean {
  return value.startsWith('data:image');
}

export function getCopyablePayload(value: string, fallbackUrl?: string): string {
  if (isBase64DataUrl(value)) {
    return fallbackUrl || '';
  }
  return value;
}
