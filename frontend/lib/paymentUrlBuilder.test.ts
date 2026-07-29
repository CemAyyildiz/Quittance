import { describe, it, expect } from 'vitest';
import { paymentUrlBuilder } from './paymentUrlBuilder';

describe('paymentUrlBuilder', () => {
  it('builds an absolute URL from origin and id', () => {
    const url = paymentUrlBuilder('http://localhost:3000', 'abc-123');
    expect(url).toBe('http://localhost:3000/pay/abc-123');
  });

  it('builds URL with https origin', () => {
    const url = paymentUrlBuilder('https://example.com', 'inv_42');
    expect(url).toBe('https://example.com/pay/inv_42');
  });

  it('strips trailing slash from origin', () => {
    const url = paymentUrlBuilder('http://localhost:3000/', 'xyz');
    expect(url).toBe('http://localhost:3000/pay/xyz');
  });

  it('encodes special characters in id', () => {
    const url = paymentUrlBuilder('http://localhost:3000', 'a/b c');
    expect(url).toBe('http://localhost:3000/pay/a%2Fb%20c');
  });

  it('trims whitespace from id', () => {
    const url = paymentUrlBuilder('http://localhost:3000', '  trim-id  ');
    expect(url).toBe('http://localhost:3000/pay/trim-id');
  });

  it('throws if origin is empty', () => {
    expect(() => paymentUrlBuilder('', 'id')).toThrow('Origin is required');
  });

  it('throws if id is empty after trim', () => {
    expect(() => paymentUrlBuilder('http://localhost:3000', '')).toThrow('Payment ID is required');
  });

  it('throws if id is only whitespace', () => {
    expect(() => paymentUrlBuilder('http://localhost:3000', '   ')).toThrow('Payment ID is required');
  });
});
