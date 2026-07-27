import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { createRateLimitStubMiddleware, resetRateLimitStubStore } from './rate-limit-stub';

function createMockRequest(ip = '127.0.0.1') {
  return {
    ip,
    method: 'GET',
    path: '/api/health',
  } as unknown as Request;
}

function createMockResponse() {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 200,
    headers,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    body: undefined as unknown,
  } as unknown as Response & { body?: unknown; headers: Record<string, string> };

  return res;
}

test('middleware is disabled by default', () => {
  resetRateLimitStubStore();
  delete process.env.RATE_LIMIT_STUB_ENABLED;

  const middleware = createRateLimitStubMiddleware();
  const req = createMockRequest();
  const res = createMockResponse();
  let called = false;
  const next: NextFunction = () => {
    called = true;
  };

  middleware(req, res, next);

  assert.equal(called, true);
  assert.equal(res.statusCode, 200);
});

test('middleware allows requests while under the configured limit', () => {
  resetRateLimitStubStore();
  process.env.RATE_LIMIT_STUB_ENABLED = 'true';
  process.env.RATE_LIMIT_STUB_MAX_REQUESTS = '2';
  process.env.RATE_LIMIT_STUB_WINDOW_MS = '60000';

  const middleware = createRateLimitStubMiddleware();
  const req = createMockRequest('10.0.0.1');
  const res = createMockResponse();
  let called = 0;
  const next: NextFunction = () => {
    called += 1;
  };

  middleware(req, res, next);
  middleware(req, res, next);

  assert.equal(called, 2);
  assert.equal(res.statusCode, 200);
});

test('middleware blocks requests after the configured limit', () => {
  resetRateLimitStubStore();
  process.env.RATE_LIMIT_STUB_ENABLED = 'true';
  process.env.RATE_LIMIT_STUB_MAX_REQUESTS = '1';
  process.env.RATE_LIMIT_STUB_WINDOW_MS = '60000';

  const middleware = createRateLimitStubMiddleware();
  const req = createMockRequest('10.0.0.2');
  const res = createMockResponse();
  let called = 0;
  const next: NextFunction = () => {
    called += 1;
  };

  middleware(req, res, next);
  middleware(req, res, next);

  assert.equal(called, 1);
  assert.equal(res.statusCode, 429);
  assert.equal((res.body as { success: boolean }).success, false);
});
