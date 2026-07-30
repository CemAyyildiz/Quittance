import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';

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
} from './utils.ts';

test('cn merges class names', () => {
  assert.equal(cn('px-4', 'py-2'), 'px-4 py-2');
});

test('cn filters falsy values', () => {
  assert.equal(cn('px-4', false && 'hidden', 'py-2'), 'px-4 py-2');
});

test('cn handles conditional classes', () => {
  assert.equal(cn('base', true && 'visible', false && 'hidden'), 'base visible');
});

test('cn returns empty string for no truthy inputs', () => {
  assert.equal(cn(false, undefined, null, ''), '');
});

test('formatAmount formats number with 2 decimals by default', () => {
  assert.equal(formatAmount(1234.5), '1,234.50');
});

test('formatAmount formats string amount', () => {
  assert.equal(formatAmount('1234.5'), '1,234.50');
});

test('formatAmount handles custom decimals', () => {
  assert.equal(formatAmount(1234.5, 0), '1,235');
});

test('formatAmount handles zero', () => {
  assert.equal(formatAmount(0), '0.00');
});

test('formatAmount handles large numbers', () => {
  assert.equal(formatAmount(1_000_000), '1,000,000.00');
});

test('formatAddress shortens address with 4 chars by default', () => {
  const address = 'GA7W2N7W2N7W2N7W2N7W2N7W2N7W2N7W2N7W2N7W2N7W2';
  const expected = `${address.slice(0, 4)}...${address.slice(-4)}`;
  assert.equal(formatAddress(address), expected);
});

test('formatAddress uses custom chars count', () => {
  const address = 'GBR6T2W2N7W2N7W2N7W2N7W2N7W2N7W2N7W2';
  const expected = `${address.slice(0, 3)}...${address.slice(-3)}`;
  assert.equal(formatAddress(address, 3), expected);
});

test('formatAddress returns empty string for empty input', () => {
  assert.equal(formatAddress(''), '');
});

test('formatAddress handles short address', () => {
  assert.equal(formatAddress('GBR6'), 'GBR6...GBR6');
});

test('formatDate formats date string', () => {
  const result = formatDate('2024-06-15T12:00:00');
  assert.equal(typeof result, 'string');
  assert.ok(result.includes('Jun'));
  assert.ok(result.includes('2024'));
});

test('formatDate formats Date object', () => {
  const result = formatDate(new Date('2024-06-15T12:00:00'));
  assert.ok(result.includes('Jun'));
  assert.ok(result.includes('2024'));
});

test('formatDate handles December date', () => {
  const result = formatDate('2025-12-25T08:00:00');
  assert.ok(result.includes('Dec'));
  assert.ok(result.includes('2025'));
});

test('getTimeRemaining returns Expired for past date', () => {
  assert.equal(getTimeRemaining('2020-01-01T00:00:00Z'), 'Expired');
});

test('getTimeRemaining returns seconds for < 1 minute', () => {
  mock.timers.enable({ apis: ['Date'] });
  try {
    const now = new Date('2025-01-01T00:00:00Z');
    mock.timers.setTime(+now);
    const future = new Date(+now + 30_000);
    assert.match(getTimeRemaining(future.toISOString()), /^\d+s$/);
  } finally {
    mock.timers.reset();
  }
});

test('getTimeRemaining returns minutes/seconds for < 1 hour', () => {
  mock.timers.enable({ apis: ['Date'] });
  try {
    const now = new Date('2025-01-01T00:00:00Z');
    mock.timers.setTime(+now);
    const future = new Date(+now + 5 * 60_000 + 30_000);
    assert.match(getTimeRemaining(future.toISOString()), /^\d+m \d+s$/);
  } finally {
    mock.timers.reset();
  }
});

test('getTimeRemaining returns hours/minutes for < 1 day', () => {
  mock.timers.enable({ apis: ['Date'] });
  try {
    const now = new Date('2025-01-01T00:00:00Z');
    mock.timers.setTime(+now);
    const future = new Date(+now + 3 * 3_600_000 + 15 * 60_000);
    assert.match(getTimeRemaining(future.toISOString()), /^\d+h \d+m$/);
  } finally {
    mock.timers.reset();
  }
});

test('getTimeRemaining returns days/hours for >= 1 day', () => {
  mock.timers.enable({ apis: ['Date'] });
  try {
    const now = new Date('2025-01-01T00:00:00Z');
    mock.timers.setTime(+now);
    const future = new Date(+now + 2 * 86_400_000 + 6 * 3_600_000);
    assert.match(getTimeRemaining(future.toISOString()), /^\d+d \d+h$/);
  } finally {
    mock.timers.reset();
  }
});

test('getTimeRemaining accepts Date object', () => {
  mock.timers.enable({ apis: ['Date'] });
  try {
    const now = new Date('2025-01-01T00:00:00Z');
    mock.timers.setTime(+now);
    const future = new Date(+now + 10 * 60_000);
    assert.match(getTimeRemaining(future), /^\d+m \d+s$/);
  } finally {
    mock.timers.reset();
  }
});

test('getShareUrl uses default URL when env not set', () => {
  const original = process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
  try {
    assert.equal(getShareUrl('inv-123'), 'http://localhost:3000/pay/inv-123');
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = original;
  }
});

test('getShareUrl uses NEXT_PUBLIC_APP_URL when set', () => {
  const original = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = 'https://quittance.app';
  try {
    assert.equal(getShareUrl('inv-456'), 'https://quittance.app/pay/inv-456');
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = original;
  }
});

test('getStatusColor returns green for paid', () => {
  assert.equal(getStatusColor('paid'), 'text-green-600 bg-green-50');
});

test('getStatusColor returns yellow for pending', () => {
  assert.equal(getStatusColor('pending'), 'text-yellow-600 bg-yellow-50');
});

test('getStatusColor returns red for expired', () => {
  assert.equal(getStatusColor('expired'), 'text-red-600 bg-red-50');
});

test('getStatusColor returns gray for cancelled', () => {
  assert.equal(getStatusColor('cancelled'), 'text-gray-600 bg-gray-50');
});

test('getStatusColor returns gray for unknown status', () => {
  assert.equal(getStatusColor('unknown'), 'text-gray-600 bg-gray-50');
});

test('getStatusColor is case-insensitive', () => {
  assert.equal(getStatusColor('PAID'), 'text-green-600 bg-green-50');
  assert.equal(getStatusColor('Pending'), 'text-yellow-600 bg-yellow-50');
  assert.equal(getStatusColor('Expired'), 'text-red-600 bg-red-50');
});

test('isValidEmail returns true for valid email', () => {
  assert.equal(isValidEmail('user@example.com'), true);
});

test('isValidEmail returns true for email with subdomain', () => {
  assert.equal(isValidEmail('user@sub.example.com'), true);
});

test('isValidEmail returns false for email without @', () => {
  assert.equal(isValidEmail('userexample.com'), false);
});

test('isValidEmail returns false for email without domain', () => {
  assert.equal(isValidEmail('user@'), false);
});

test('isValidEmail returns false for empty string', () => {
  assert.equal(isValidEmail(''), false);
});

test('isValidEmail returns false for string with only spaces', () => {
  assert.equal(isValidEmail(' '), false);
});

test('formatCurrency formats with XLM default', () => {
  assert.equal(formatCurrency(123.456789), '123.4567890 XLM');
});

test('formatCurrency formats with custom currency', () => {
  assert.equal(formatCurrency(50, 'USDC'), '50.0000000 USDC');
});

test('formatCurrency handles zero', () => {
  assert.equal(formatCurrency(0), '0.0000000 XLM');
});

test('formatCurrency formats large amount', () => {
  assert.equal(formatCurrency(1_000_000), '1,000,000.0000000 XLM');
});
