import { describe, it, expect } from 'vitest';
import { shortenAddress } from './shortenAddress';

describe('shortenAddress', () => {
  it('shortens a full-length Stellar address with default lengths', () => {
    const address = 'GA4S7W3X6P2Q5KZDPRQZ4YQZ3NZF2WX4X5Y6Z7Q8R9S0T1U2V3W4X5Y6Z7';
    expect(shortenAddress(address)).toBe('GA4S...Y6Z7');
  });

  it('returns empty string for null or undefined', () => {
    expect(shortenAddress('')).toBe('');
  });

  it('returns short strings unchanged', () => {
    expect(shortenAddress('ABC')).toBe('ABC');
    expect(shortenAddress('ABCDEF')).toBe('ABCDEF');
    expect(shortenAddress('ABCDEFG')).toBe('ABCDEFG');
    expect(shortenAddress('ABCDEFGH')).toBe('ABCDEFGH');
  });

  it('returns empty string when address is empty', () => {
    expect(shortenAddress('')).toBe('');
  });

  it('accepts custom prefix length', () => {
    const address = 'GA4S7W3X6P2Q5KZDPRQZ4YQZ3NZF2WX4X5Y6Z7Q8R9S0T1U2V3W4X5Y6Z7';
    expect(shortenAddress(address, { prefixLength: 6 })).toBe('GA4S7W...Y6Z7');
  });

  it('accepts custom suffix length', () => {
    const address = 'GA4S7W3X6P2Q5KZDPRQZ4YQZ3NZF2WX4X5Y6Z7Q8R9S0T1U2V3W4X5Y6Z7';
    expect(shortenAddress(address, { suffixLength: 6 })).toBe('GA4S...X5Y6Z7');
  });

  it('accepts both custom prefix and suffix lengths', () => {
    const address = 'GA4S7W3X6P2Q5KZDPRQZ4YQZ3NZF2WX4X5Y6Z7Q8R9S0T1U2V3W4X5Y6Z7';
    expect(shortenAddress(address, { prefixLength: 3, suffixLength: 5 })).toBe(
      'GA4...X5Y6Z7',
    );
  });

  it('returns address unchanged when shorter than combined prefix+suffix', () => {
    expect(shortenAddress('SHORT', { prefixLength: 4, suffixLength: 4 })).toBe(
      'SHORT',
    );
  });

  it('returns address unchanged when exactly equal to combined prefix+suffix', () => {
    expect(shortenAddress('12345678', { prefixLength: 4, suffixLength: 4 })).toBe(
      '12345678',
    );
  });

  it('uses prefixLength=0 showing only ellipsis and suffix', () => {
    const address = 'GA4S7W3X6P2Q5KZDPRQZ4YQZ3NZF2WX4X5Y6Z7Q8R9S0T1U2V3W4X5Y6Z7';
    expect(shortenAddress(address, { prefixLength: 0 })).toBe('...Y6Z7');
  });

  it('uses suffixLength=0 showing only prefix and ellipsis', () => {
    const address = 'GA4S7W3X6P2Q5KZDPRQZ4YQZ3NZF2WX4X5Y6Z7Q8R9S0T1U2V3W4X5Y6Z7';
    expect(shortenAddress(address, { suffixLength: 0 })).toBe('GA4S...');
  });
});
