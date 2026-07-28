export interface ShortenAddressOptions {
  prefixLength?: number;
  suffixLength?: number;
}

const DEFAULT_PREFIX_LENGTH = 4;
const DEFAULT_SUFFIX_LENGTH = 4;
const ELLIPSIS = '...';

export function shortenAddress(
  address: string,
  options?: ShortenAddressOptions,
): string {
  if (!address) return '';

  const prefixLength = options?.prefixLength ?? DEFAULT_PREFIX_LENGTH;
  const suffixLength = options?.suffixLength ?? DEFAULT_SUFFIX_LENGTH;

  if (address.length <= prefixLength + suffixLength) return address;

  return `${address.slice(0, prefixLength)}${ELLIPSIS}${address.slice(-suffixLength)}`;
}
