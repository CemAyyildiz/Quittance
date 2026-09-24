import { describe, it, expect, vi, afterEach } from 'vitest';
import { rateLimitStub, rateLimitIfEnabled } from '../rate-limit-stub';

// The stub keeps a module-level store keyed by `ip|path`, so each test uses a
// unique client IP to avoid cross-test pollution.
let ipCounter = 0;

function mockReq(path = '/api/health') {
  ipCounter += 1;
  return {
    ip: `203.0.113.${ipCounter}`,
    socket: { remoteAddress: undefined },
    path,
  } as any;
}

function mockRes() {
  const res: any = {
    headers: {} as Record<string, string>,
    set(name: string, value: string) {
      res.headers[name] = value;
      return res;
    },
    statusCode: 200,
    body: undefined as any,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
  };
  return res;
}

function nextSpy() {
  return vi.fn();
}

afterEach(() => {
  vi.useRealTimers();
});

describe('rateLimitStub', () => {
  it('calls next() for requests within the limit', () => {
    const middleware = rateLimitStub({ windowMs: 60_000, maxRequests: 2 });
    const req = mockReq();
    const res = mockRes();
    const next = nextSpy();

    middleware(req, res, next);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.statusCode).toBe(200);
  });

  it('sets rate-limit headers with decreasing remaining count', () => {
    const middleware = rateLimitStub({ windowMs: 60_000, maxRequests: 2 });
    const req = mockReq();
    const res = mockRes();
    const next = nextSpy();

    middleware(req, res, next);
    expect(res.headers['X-RateLimit-Limit']).toBe('2');
    expect(res.headers['X-RateLimit-Remaining']).toBe('1');
    expect(res.headers['X-RateLimit-Reset']).toMatch(/^\d+$/);

    middleware(req, res, next);
    expect(res.headers['X-RateLimit-Remaining']).toBe('0');
  });

  it('returns 429 once the limit is exceeded', () => {
    const middleware = rateLimitStub({ windowMs: 60_000, maxRequests: 2 });
    const req = mockReq();
    const res = mockRes();
    const next = nextSpy();

    middleware(req, res, next);
    middleware(req, res, next);
    middleware(req, res, next);

    expect(res.statusCode).toBe(429);
    expect(next).toHaveBeenCalledTimes(2);
    expect(res.body).toMatchObject({
      success: false,
      error: expect.any(String),
      retryAfter: expect.any(Number),
    });
  });

  it('sets Retry-After and rate-limit headers on a 429 response', () => {
    const middleware = rateLimitStub({ windowMs: 60_000, maxRequests: 1 });
    const req = mockReq();
    const res = mockRes();
    const next = nextSpy();

    middleware(req, res, next);
    middleware(req, res, next);

    expect(res.statusCode).toBe(429);
    expect(res.headers['Retry-After']).toMatch(/^\d+$/);
    expect(Number(res.headers['Retry-After'])).toBeGreaterThan(0);
    expect(res.headers['X-RateLimit-Limit']).toBe('1');
    expect(res.headers['X-RateLimit-Remaining']).toBe('0');
    expect(res.headers['X-RateLimit-Reset']).toMatch(/^\d+$/);
  });

  it('rejects once the limit is exceeded within the same window', () => {
    const middleware = rateLimitStub({ windowMs: 60_000, maxRequests: 1 });
    const req = mockReq();
    const res = mockRes();
    const next = nextSpy();

    middleware(req, res, next);
    middleware(req, res, next);

    expect(res.statusCode).toBe(429);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('opens a fresh window after windowMs elapses', () => {
    vi.useFakeTimers();
    const middleware = rateLimitStub({ windowMs: 60_000, maxRequests: 1 });
    const req = mockReq();
    const res = mockRes();
    const next = nextSpy();

    middleware(req, res, next);
    middleware(req, res, next);
    expect(res.statusCode).toBe(429);

    vi.advanceTimersByTime(60_001);

    const res2 = mockRes();
    const next2 = nextSpy();
    middleware(req, res2, next2);

    expect(res2.statusCode).toBe(200);
    expect(next2).toHaveBeenCalledTimes(1);
    expect(res2.headers['X-RateLimit-Remaining']).toBe('0');
  });

  it('keys counters by client IP', () => {
    const middleware = rateLimitStub({ windowMs: 60_000, maxRequests: 1 });
    const reqA = mockReq();
    const reqB = mockReq();

    const resA = mockRes();
    const nextA = nextSpy();
    middleware(reqA, resA, nextA);
    middleware(reqA, resA, nextA);
    expect(resA.statusCode).toBe(429);

    // A different IP on the same path is unaffected.
    const resB = mockRes();
    const nextB = nextSpy();
    middleware(reqB, resB, nextB);
    expect(resB.statusCode).toBe(200);
    expect(nextB).toHaveBeenCalledTimes(1);
  });

  it('keys counters by request path', () => {
    const middleware = rateLimitStub({ windowMs: 60_000, maxRequests: 1 });
    const reqA = mockReq('/api/health');
    const reqB = mockReq('/api/other');

    const resA = mockRes();
    const nextA = nextSpy();
    middleware(reqA, resA, nextA);
    middleware(reqA, resA, nextA);
    expect(resA.statusCode).toBe(429);

    // A different path from the same IP is unaffected.
    const resB = mockRes();
    const nextB = nextSpy();
    middleware(reqB, resB, nextB);
    expect(resB.statusCode).toBe(200);
    expect(nextB).toHaveBeenCalledTimes(1);
  });

  it('falls back to socket.remoteAddress when req.ip is missing', () => {
    const middleware = rateLimitStub({ windowMs: 60_000, maxRequests: 1 });
    ipCounter += 1;
    const req: any = {
      socket: { remoteAddress: `198.51.100.${ipCounter}` },
      path: '/api/health',
    };
    const res = mockRes();
    const next = nextSpy();

    middleware(req, res, next);
    middleware(req, res, next);

    expect(res.statusCode).toBe(429);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('rateLimitIfEnabled', () => {
  afterEach(() => {
    delete process.env.RATE_LIMIT_ENABLED;
  });

  it('is a no-op pass-through when RATE_LIMIT_ENABLED is not "true"', () => {
    delete process.env.RATE_LIMIT_ENABLED;
    const middleware = rateLimitIfEnabled({ windowMs: 60_000, maxRequests: 1 });

    const req = mockReq();
    const res = mockRes();
    const next = nextSpy();

    middleware(req, res, next);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.statusCode).toBe(200);
    expect(res.headers['X-RateLimit-Limit']).toBeUndefined();
  });

  it('enforces the limit when RATE_LIMIT_ENABLED is "true"', () => {
    process.env.RATE_LIMIT_ENABLED = 'true';
    const middleware = rateLimitIfEnabled({ windowMs: 60_000, maxRequests: 1 });

    const req = mockReq();
    const res = mockRes();
    const next = nextSpy();

    middleware(req, res, next);
    middleware(req, res, next);

    expect(res.statusCode).toBe(429);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.headers['Retry-After']).toMatch(/^\d+$/);
  });
});
