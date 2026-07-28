import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

// Permissive but safe pattern: alphanumerics, dot, underscore, and dash.
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
const REQUEST_ID_MAX_LENGTH = 128;

/**
 * Resolve a request id, accepting a caller-supplied `x-request-id` header when it
 * is safe. The header is validated against REQUEST_ID_PATTERN (a restrictive
 * safe-by-construction character set) and capped at REQUEST_ID_MAX_LENGTH,
 * which makes the middleware safe against CRLF, NUL, and other control-char
 * injection attempts in a hostile client header. Non-matching inbound headers
 * fall back to a freshly generated nanoid.
 */
function buildRequestId(req: Request): string {
  const incoming = req.header('x-request-id');
  // The regex requires at least one character, so an empty string is already rejected.
  if (
    typeof incoming === 'string' &&
    incoming.length <= REQUEST_ID_MAX_LENGTH &&
    REQUEST_ID_PATTERN.test(incoming)
  ) {
    return incoming;
  }
  return nanoid();
}

/**
 * Express middleware that attaches a correlation id to every request.
 *
 * - Sets `req.requestId` to a string the rest of the pipeline can use.
 * - Echoes the same id via the `x-request-id` response header so clients can
 *   correlate logs end-to-end.
 * - Honors a safe inbound `x-request-id` header from the client for
 *   distributed correlation; unsafe inbound ids are silently replaced.
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = buildRequestId(req);
  req.requestId = id;
  res.setHeader('x-request-id', id);
  next();
}
