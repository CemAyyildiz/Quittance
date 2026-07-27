import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isMockEnabled } from '../api-config';

const ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCK;

describe('isMockEnabled', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_USE_MOCK;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_USE_MOCK = ORIGINAL;
  });

  it('returns true when NEXT_PUBLIC_USE_MOCK is exactly "true"', () => {
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
});
