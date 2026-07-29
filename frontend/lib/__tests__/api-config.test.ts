import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isMockEnabled } from '../api-config';

const ORIGINAL_MOCK = process.env.NEXT_PUBLIC_USE_MOCK;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

describe('isMockEnabled', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_USE_MOCK;
    // Keep non-production for most tests
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    if (ORIGINAL_MOCK === undefined) {
      delete process.env.NEXT_PUBLIC_USE_MOCK;
    } else {
      process.env.NEXT_PUBLIC_USE_MOCK = ORIGINAL_MOCK;
    }
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: ORIGINAL_NODE_ENV,
      configurable: true,
      writable: true,
    });
  });

  it('returns true when NEXT_PUBLIC_USE_MOCK is exactly "true" in non-production', () => {
    process.env.NEXT_PUBLIC_USE_MOCK = 'true';
    expect(isMockEnabled()).toBe(true);
  });

  it('returns false when NEXT_PUBLIC_USE_MOCK is "false"', () => {
    process.env.NEXT_PUBLIC_USE_MOCK = 'false';
    expect(isMockEnabled()).toBe(false);
  });

  it('returns false when NEXT_PUBLIC_USE_MOCK is unset', () => {
    delete process.env.NEXT_PUBLIC_USE_MOCK;
    expect(isMockEnabled()).toBe(false);
  });

  it('returns false when NEXT_PUBLIC_USE_MOCK is "TRUE" (case-sensitive)', () => {
    process.env.NEXT_PUBLIC_USE_MOCK = 'TRUE';
    expect(isMockEnabled()).toBe(false);
  });

  it('returns false when NEXT_PUBLIC_USE_MOCK is "1"', () => {
    process.env.NEXT_PUBLIC_USE_MOCK = '1';
    expect(isMockEnabled()).toBe(false);
  });

  it('returns false when NEXT_PUBLIC_USE_MOCK is empty string', () => {
    process.env.NEXT_PUBLIC_USE_MOCK = '';
    expect(isMockEnabled()).toBe(false);
  });

  it('hard-blocks mock when NODE_ENV is production even if USE_MOCK=true', () => {
    process.env.NEXT_PUBLIC_USE_MOCK = 'true';
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      configurable: true,
      writable: true,
    });
    expect(isMockEnabled()).toBe(false);
  });
});
