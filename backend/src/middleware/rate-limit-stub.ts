/**
 * Opt-in in-memory rate-limit stub middleware.
 *
 * Enabled only when `RATE_LIMIT_ENABLED=true` (default: off).
 * Uses a simple per-IP+path sliding-window counter stored in memory.
 *
 * Out of scope: Redis/Bull, production WAF.
 *
 * ## Manual smoke-test
 *
 * 1. Start the MVP server with `RATE_LIMIT_ENABLED=true`:
 *    `RATE_LIMIT_ENABLED=true npm run dev:mvp`
 *
 * 2. Send > 60 requests to the same endpoint within 1 minute:
 *    `for i in $(seq 1 65); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/health; done`
 *
 * 3. Expect the first 60 requests to return 200 and the remaining to return
 *    429 with headers `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
 *    `X-RateLimit-Reset`.
 *
 * 4. Without the flag (default) every request passes through with 200.
 */

import { Request, Response, NextFunction } from 'express';

// ── Types ───────────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  /** Sliding window duration in milliseconds (default: 60_000 = 1 min). */
  windowMs?: number;
  /** Maximum requests allowed per window (default: 60). */
  maxRequests?: number;
}

// ── In-memory store ─────────────────────────────────────────────────────────

const store = new Map<string, RateLimitEntry>();

/** Periodic cleanup of expired entries so the store doesn't leak memory. */
const CLEANUP_INTERVAL_MS = 60_000; // every 60 s
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS).unref(); // .unref() so the timer doesn't prevent process exit

// ── Middleware factory ───────────────────────────────────────────────────────

/**
 * Returns Express middleware that rate-limits requests per client (IP + path).
 *
 * When the limit is exceeded the middleware short-circuits with HTTP 429 and
 * sets standard rate-limit response headers.
 */
export function rateLimitStub(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 60_000; // 1 minute
  const maxRequests = options.maxRequests ?? 60; // 60 requests / window

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientKey =
      (req.ip ?? req.socket.remoteAddress ?? 'unknown') + '|' + req.path;
    const now = Date.now();

    let entry = store.get(clientKey);

    if (!entry || now > entry.resetAt) {
      // Start a fresh window
      const resetAt = now + windowMs;
      store.set(clientKey, { count: 1, resetAt });
      setHeaders(res, maxRequests, maxRequests - 1, resetAt);
      return next();
    }

    entry.count++;

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      console.warn(
        `[rate-limit] ${clientKey} exceeded limit (${entry.count}/${maxRequests})`,
      );

      res.set('Retry-After', String(retryAfter));
      setHeaders(res, maxRequests, 0, entry.resetAt);

      res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter,
      });
      return;
    }

    setHeaders(res, maxRequests, maxRequests - entry.count, entry.resetAt);
    next();
  };
}

// ── Opt-in convenience wrapper ──────────────────────────────────────────────

/**
 * Applies `rateLimitStub` only when the `RATE_LIMIT_ENABLED` env-var is
 * `"true"`, otherwise passes every request through (no-op).  This keeps the
 * demo UX unchanged by default.
 */
export function rateLimitIfEnabled(options?: RateLimitOptions) {
  const enabled = process.env.RATE_LIMIT_ENABLED === 'true';

  if (!enabled) {
    return (_req: Request, _res: Response, next: NextFunction): void => next();
  }

  console.log('[rate-limit] Rate limiting enabled (in-memory stub)');
  return rateLimitStub(options);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function setHeaders(
  res: Response,
  limit: number,
  remaining: number,
  resetAt?: number,
): void {
  res.set('X-RateLimit-Limit', String(limit));
  res.set('X-RateLimit-Remaining', String(Math.max(0, remaining)));
  if (resetAt) {
    res.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
  }
}
