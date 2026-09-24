import { describe, it, expect } from 'vitest';
import { isValidStellarPublicKey } from '../publicKeyValidate';

const VALID_KEY = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW';

describe('isValidStellarPublicKey', () => {
  it('accepts a valid public key', () => {
    expect(isValidStellarPublicKey(VALID_KEY)).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidStellarPublicKey('')).toBe(false);
  });

  it('rejects whitespace-only string', () => {
    expect(isValidStellarPublicKey('   ')).toBe(false);
  });

  it('rejects wrong prefix S (secret key)', () => {
    const key = 'S' + VALID_KEY.slice(1);
    expect(isValidStellarPublicKey(key)).toBe(false);
  });

  it('rejects wrong prefix C (pre-auth tx hash)', () => {
    const key = 'C' + VALID_KEY.slice(1);
    expect(isValidStellarPublicKey(key)).toBe(false);
  });

  it('rejects wrong prefix X (hash x)', () => {
    const key = 'X' + VALID_KEY.slice(1);
    expect(isValidStellarPublicKey(key)).toBe(false);
  });

  it('rejects key that is too short', () => {
    expect(isValidStellarPublicKey(VALID_KEY.slice(0, 55))).toBe(false);
  });

  it('rejects key that is too long', () => {
    expect(isValidStellarPublicKey(VALID_KEY + 'A')).toBe(false);
  });

  it('rejects lowercase letters', () => {
    expect(isValidStellarPublicKey(VALID_KEY.toLowerCase())).toBe(false);
  });

  it('rejects digit 0', () => {
    const key = 'G' + '0' + VALID_KEY.slice(2);
    expect(isValidStellarPublicKey(key)).toBe(false);
  });

  it('rejects digit 1', () => {
    const key = 'G' + '1' + VALID_KEY.slice(2);
    expect(isValidStellarPublicKey(key)).toBe(false);
  });

  it('rejects digit 8', () => {
    const key = 'G' + '8' + VALID_KEY.slice(2);
    expect(isValidStellarPublicKey(key)).toBe(false);
  });

  it('rejects digit 9', () => {
    const key = 'G' + '9' + VALID_KEY.slice(2);
    expect(isValidStellarPublicKey(key)).toBe(false);
  });

  it('rejects hyphen', () => {
    const key = 'G' + '-' + VALID_KEY.slice(2);
    expect(isValidStellarPublicKey(key)).toBe(false);
  });

  it('rejects underscore', () => {
    const key = 'G' + '_' + VALID_KEY.slice(2);
    expect(isValidStellarPublicKey(key)).toBe(false);
  });

  it('trims leading whitespace and validates', () => {
    expect(isValidStellarPublicKey('  ' + VALID_KEY)).toBe(true);
  });

  it('trims trailing whitespace and validates', () => {
    expect(isValidStellarPublicKey(VALID_KEY + '  ')).toBe(true);
  });

  it('returns false for non-string input (number)', () => {
    expect(isValidStellarPublicKey(123 as unknown as string)).toBe(false);
  });

  it('returns false for non-string input (null)', () => {
    expect(isValidStellarPublicKey(null as unknown as string)).toBe(false);
  });

  it('returns false for non-string input (undefined)', () => {
    expect(isValidStellarPublicKey(undefined as unknown as string)).toBe(false);
  });
});
