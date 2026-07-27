import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const state = new Map<string, RateLimitEntry>();

function getEnvBoolean(name: string): boolean {
  return process.env[name] === 'true';
}

function getEnvNumber(name: string, fallback: number): number {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resetRateLimitStubStore(): void {
  state.clear();
}

export function createRateLimitStubMiddleware() {
  const enabled = getEnvBoolean('RATE_LIMIT_STUB_ENABLED');
  const maxRequests = getEnvNumber('RATE_LIMIT_STUB_MAX_REQUESTS', 30);
  const windowMs = getEnvNumber('RATE_LIMIT_STUB_WINDOW_MS', 60_000);

  if (!enabled) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const existing = state.get(key);

    if (!existing || existing.resetAt <= now) {
      state.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (existing.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
      return;
    }

    existing.count += 1;
    return next();
  };
}
