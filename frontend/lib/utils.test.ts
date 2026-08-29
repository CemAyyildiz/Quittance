import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cn,
  formatAmount,
  formatAddress,
  formatDate,
  getTimeRemaining,
  getShareUrl,
  getStatusColor,
  isValidEmail,
  formatCurrency,
} from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('filters falsy values', () => {
    expect(cn('px-4', false && 'hidden', 'py-2')).toBe('px-4 py-2');
  });

  it('handles conditional classes', () => {
    expect(cn('base', true && 'visible', false && 'hidden')).toBe('base visible');
  });

  it('returns empty string for no truthy inputs', () => {
    expect(cn(false, undefined, null, '')).toBe('');
  });
});

describe('formatAmount', () => {
  it('formats number with 2 decimals by default', () => {
    expect(formatAmount(1234.5)).toBe('1,234.50');
  });

  it('formats string amount', () => {
    expect(formatAmount('1234.5')).toBe('1,234.50');
  });

  it('handles custom decimals', () => {
    expect(formatAmount(1234.5, 0)).toBe('1,235');
  });

  it('handles zero', () => {
    expect(formatAmount(0)).toBe('0.00');
  });

  it('handles large numbers', () => {
    expect(formatAmount(1_000_000)).toBe('1,000,000.00');
  });
});

describe('formatAddress', () => {
  it('shortens address with 4 chars by default', () => {
    const address = 'GA7W2N7W2N7W2N7W2N7W2N7W2N7W2N7W2N7W2N7W2N7W2';
    const expected = `${address.slice(0, 4)}...${address.slice(-4)}`;
    expect(formatAddress(address)).toBe(expected);
  });

  it('uses custom chars count', () => {
    const address = 'GBR6T2W2N7W2N7W2N7W2N7W2N7W2N7W2N7W2';
    const expected = `${address.slice(0, 3)}...${address.slice(-3)}`;
    expect(formatAddress(address, 3)).toBe(expected);
  });

  it('returns empty string for empty input', () => {
    expect(formatAddress('')).toBe('');
  });

  it('handles short address', () => {
    expect(formatAddress('GBR6')).toBe('GBR6...GBR6');
  });
});

describe('formatDate', () => {
  it('formats date string', () => {
    const result = formatDate('2024-06-15T12:00:00');
    expect(typeof result).toBe('string');
    expect(result).toContain('Jun');
    expect(result).toContain('2024');
  });

  it('formats Date object', () => {
    const result = formatDate(new Date('2024-06-15T12:00:00'));
    expect(result).toContain('Jun');
    expect(result).toContain('2024');
  });

  it('handles December date', () => {
    const result = formatDate('2025-12-25T08:00:00');
    expect(result).toContain('Dec');
    expect(result).toContain('2025');
  });
});

describe('getTimeRemaining', () => {
  it('returns Expired for past date', () => {
    expect(getTimeRemaining('2020-01-01T00:00:00Z')).toBe('Expired');
  });

  it('returns seconds for < 1 minute', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    try {
      const future = new Date(Date.now() + 30_000);
      expect(getTimeRemaining(future.toISOString())).toMatch(/^\d+s$/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns minutes/seconds for < 1 hour', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    try {
      const future = new Date(Date.now() + 5 * 60_000 + 30_000);
      expect(getTimeRemaining(future.toISOString())).toMatch(/^\d+m \d+s$/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns hours/minutes for < 1 day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    try {
      const future = new Date(Date.now() + 3 * 3_600_000 + 15 * 60_000);
      expect(getTimeRemaining(future.toISOString())).toMatch(/^\d+h \d+m$/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns days/hours for >= 1 day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    try {
      const future = new Date(Date.now() + 2 * 86_400_000 + 6 * 3_600_000);
      expect(getTimeRemaining(future.toISOString())).toMatch(/^\d+d \d+h$/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('accepts Date object', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    try {
      const future = new Date(Date.now() + 10 * 60_000);
      expect(getTimeRemaining(future)).toMatch(/^\d+m \d+s$/);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('getShareUrl', () => {
  it('uses default URL when env not set', () => {
    const original = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    try {
      expect(getShareUrl('inv-123')).toBe('http://localhost:3000/pay/inv-123');
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = original;
    }
  });

  it('uses NEXT_PUBLIC_APP_URL when set', () => {
    const original = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://quittance.app';
    try {
      expect(getShareUrl('inv-456')).toBe('https://quittance.app/pay/inv-456');
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = original;
    }
  });
});

describe('getStatusColor', () => {
  it('returns green for paid', () => {
    expect(getStatusColor('paid')).toBe('text-green-600 bg-green-50');
  });

  it('returns yellow for pending', () => {
    expect(getStatusColor('pending')).toBe('text-yellow-600 bg-yellow-50');
  });

  it('returns red for expired', () => {
    expect(getStatusColor('expired')).toBe('text-red-600 bg-red-50');
  });

  it('returns gray for cancelled', () => {
    expect(getStatusColor('cancelled')).toBe('text-gray-600 bg-gray-50');
  });

  it('returns gray for unknown status', () => {
    expect(getStatusColor('unknown')).toBe('text-gray-600 bg-gray-50');
  });

  it('is case-insensitive', () => {
    expect(getStatusColor('PAID')).toBe('text-green-600 bg-green-50');
    expect(getStatusColor('Pending')).toBe('text-yellow-600 bg-yellow-50');
    expect(getStatusColor('Expired')).toBe('text-red-600 bg-red-50');
  });
});

describe('isValidEmail', () => {
  it('returns true for valid email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('returns true for email with subdomain', () => {
    expect(isValidEmail('user@sub.example.com')).toBe(true);
  });

  it('returns false for email without @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('returns false for email without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('returns false for string with only spaces', () => {
    expect(isValidEmail(' ')).toBe(false);
  });
});

describe('formatCurrency', () => {
  it('formats with XLM default', () => {
    expect(formatCurrency(123.456789)).toBe('123.4567890 XLM');
  });

  it('formats with custom currency', () => {
    expect(formatCurrency(50, 'USDC')).toBe('50.0000000 USDC');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('0.0000000 XLM');
  });

  it('formats large amount', () => {
    expect(formatCurrency(1_000_000)).toBe('1,000,000.0000000 XLM');
  });
});
