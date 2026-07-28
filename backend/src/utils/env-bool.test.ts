import { describe, it, expect } from 'vitest';
import { parseEnvBool } from './env-bool';

describe('parseEnvBool', () => {
  describe('truthy values', () => {
    it.each([
      ['true', true],
      ['TRUE', true],
      ['True', true],
      ['1', true],
      ['yes', true],
      ['YES', true],
      ['Yes', true],
      ['  true  ', true],
      ['  YES  ', true],
    ])('parseEnvBool(%s) returns %s', (input, expected) => {
      expect(parseEnvBool(input)).toBe(expected);
    });
  });

  describe('falsy values', () => {
    it.each([
      ['false', false],
      ['FALSE', false],
      ['False', false],
      ['0', false],
      ['no', false],
      ['NO', false],
      ['No', false],
      ['  false  ', false],
      ['  NO  ', false],
    ])('parseEnvBool(%s) returns %s', (input, expected) => {
      expect(parseEnvBool(input)).toBe(expected);
    });
  });

  describe('undefined / missing', () => {
    it('returns false by default when undefined', () => {
      expect(parseEnvBool(undefined)).toBe(false);
    });

    it('respects custom default when undefined', () => {
      expect(parseEnvBool(undefined, true)).toBe(true);
    });
  });

  describe('unrecognised values', () => {
    it.each([['maybe'], ['2'], ['truthy'], [''], ['null']])(
      'returns default for %s',
      (input) => {
        expect(parseEnvBool(input)).toBe(false);
        expect(parseEnvBool(input, true)).toBe(true);
      },
    );
  });
});
