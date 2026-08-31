import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isMockEnabled } from '../api-config';

describe('isMockEnabled', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK', undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns true when NEXT_PUBLIC_USE_MOCK is exactly "true" in non-production', () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK', 'true');
    expect(isMockEnabled()).toBe(true);
  });

  it('returns false when NEXT_PUBLIC_USE_MOCK is "false"', () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK', 'false');
    expect(isMockEnabled()).toBe(false);
  });

  it('returns false when NEXT_PUBLIC_USE_MOCK is unset', () => {
    expect(isMockEnabled()).toBe(false);
  });

  it('returns false when NEXT_PUBLIC_USE_MOCK is "TRUE" (case-sensitive)', () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK', 'TRUE');
    expect(isMockEnabled()).toBe(false);
  });

  it('returns false when NEXT_PUBLIC_USE_MOCK is "1"', () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK', '1');
    expect(isMockEnabled()).toBe(false);
  });

  it('returns false when NEXT_PUBLIC_USE_MOCK is empty string', () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK', '');
    expect(isMockEnabled()).toBe(false);
  });

  it('hard-blocks mock when NODE_ENV is production even if USE_MOCK=true', () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    expect(isMockEnabled()).toBe(false);
  });
});
