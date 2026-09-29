export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 100;

export interface PaginationQueryInput {
  limit?: unknown;
  offset?: unknown;
}

export interface PaginationQuery {
  limit: number;
  offset: number;
}

function parseInteger(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) ? value : undefined;
  }

  if (typeof value !== 'string' || !/^\s*[+-]?\d+\s*$/.test(value)) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

/**
 * Parse list pagination without allowing NaN, fractions, or unbounded limits
 * to reach a database query. Invalid limits use the documented default; an
 * invalid or negative offset starts at the first record.
 */
export function parsePaginationQuery(input: PaginationQueryInput = {}): PaginationQuery {
  const parsedLimit = parseInteger(input.limit);
  const parsedOffset = parseInteger(input.offset);

  const limit =
    parsedLimit === undefined || parsedLimit < 1
      ? DEFAULT_PAGE_LIMIT
      : Math.min(parsedLimit, MAX_PAGE_LIMIT);
  const offset = parsedOffset === undefined || parsedOffset < 0 ? 0 : parsedOffset;

  return { limit, offset };
}
