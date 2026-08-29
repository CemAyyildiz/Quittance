import { z } from 'zod';

export interface ZodErrorFields {
  [field: string]: string[];
}

export interface ZodErrorResponse {
  error: string;
  fields: ZodErrorFields;
}

/**
 * Convert a ZodError into a stable API response shape.
 * Does not mutate the original error.
 */
export function formatZodError(err: z.ZodError): ZodErrorResponse {
  const fields: ZodErrorFields = {};

  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_root';
    if (!fields[key]) {
      fields[key] = [];
    }
    fields[key].push(issue.message);
  }

  return {
    error: 'Validation failed',
    fields,
  };
}

/**
 * Safe wrapper: if input is a ZodError, format it; otherwise return null.
 */
export function formatIfZodError(err: unknown): ZodErrorResponse | null {
  if (err instanceof z.ZodError) {
    return formatZodError(err);
  }
  return null;
}

export default {
  formatZodError,
  formatIfZodError,
};
