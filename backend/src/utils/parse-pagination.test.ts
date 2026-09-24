import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  parsePaginationQuery,
} from './parse-pagination';

describe('parsePaginationQuery', () => {
  it('parses string query params', () => {
    expect(parsePaginationQuery({ limit: '25', offset: '50' })).toEqual({
      limit: 25,
      offset: 50,
    });
  });

  it('uses a safe default for missing or invalid limits', () => {
    expect(parsePaginationQuery()).toEqual({ limit: DEFAULT_PAGE_LIMIT, offset: 0 });
    expect(parsePaginationQuery({ limit: 'NaN', offset: 'nope' })).toEqual({
      limit: DEFAULT_PAGE_LIMIT,
      offset: 0,
    });
    expect(parsePaginationQuery({ limit: '-1' }).limit).toBe(DEFAULT_PAGE_LIMIT);
  });

  it('clamps large limits and floors negative offsets', () => {
    expect(parsePaginationQuery({ limit: '1000', offset: '-20' })).toEqual({
      limit: MAX_PAGE_LIMIT,
      offset: 0,
    });
  });

  it('rejects fractional and unsafe numeric values', () => {
    expect(parsePaginationQuery({ limit: 1.5, offset: Number.MAX_SAFE_INTEGER + 1 })).toEqual({
      limit: DEFAULT_PAGE_LIMIT,
      offset: 0,
    });
  });

  it('accepts surrounding whitespace and preserves a non-negative offset', () => {
    expect(parsePaginationQuery({ limit: ' 7 ', offset: ' +12 ' })).toEqual({
      limit: 7,
      offset: 12,
    });
  });
});
