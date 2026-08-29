import { describe, it, expect } from 'vitest';
import { formatUptime } from './format-uptime';

describe('formatUptime', () => {
  describe('zero seconds', () => {
    it('formats 0 as "0s"', () => {
      expect(formatUptime(0)).toBe('0s');
    });
  });

  describe('sub-minute durations', () => {
    it.each([
      [1, '1s'],
      [9, '9s'],
      [45, '45s'],
      [59, '59s'],
    ])('formats %i second(s) as "%s"', (seconds, expected) => {
      expect(formatUptime(seconds)).toBe(expected);
    });
  });

  describe('minutes and hours', () => {
    it.each([
      [60, '1m 0s'],
      [61, '1m 1s'],
      [130, '2m 10s'],
      [3599, '59m 59s'],
      [3600, '1h 0s'],
      [3661, '1h 1m 1s'],
      [3700, '1h 1m 40s'],
      [90061, '25h 1m 1s'],
    ])('formats %i seconds as "%s"', (seconds, expected) => {
      expect(formatUptime(seconds)).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('omits zero hours and minutes but always shows seconds', () => {
      expect(formatUptime(0)).toBe('0s');
      expect(formatUptime(60)).toBe('1m 0s');
      expect(formatUptime(3600)).toBe('1h 0s');
    });
  });
});
