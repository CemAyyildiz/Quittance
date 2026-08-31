import { describe, it, expect, vi } from 'vitest';
import { requestId } from '../request-id';

function mockReq(headers: Record<string, string> = {}) {
  const lower: Record<string, string> = {};
  for (const key of Object.keys(headers)) {
    lower[key.toLowerCase()] = headers[key];
  }
  return {
    header: (name: string) => lower[name.toLowerCase()],
  } as any;
}

function mockRes() {
  return { setHeader: vi.fn() } as any;
}

describe('requestId middleware', () => {
  it('sets x-request-id header on response', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    requestId(req, res, next);

    expect(res.setHeader).toHaveBeenCalledOnce();
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', expect.any(String));
  });

  it('attaches a string requestId on request', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    requestId(req, res, next);

    expect(req).toHaveProperty('requestId');
    expect(typeof req.requestId).toBe('string');
    expect(req.requestId.length).toBeGreaterThan(0);
  });

  it('generates a unique id on each call when no inbound id is supplied', () => {
    const next = vi.fn();

    const req1 = mockReq();
    const res1 = mockRes();
    requestId(req1, res1, next);

    const req2 = mockReq();
    const res2 = mockRes();
    requestId(req2, res2, next);

    expect(req1.requestId).not.toBe(req2.requestId);
  });

  it('calls next', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    requestId(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('honors a safe incoming x-request-id header', () => {
    const incomingId = 'abc-123_456.789-test';
    const req = mockReq({ 'x-request-id': incomingId });
    const res = mockRes();
    const next = vi.fn();

    requestId(req, res, next);

    expect(req.requestId).toBe(incomingId);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', incomingId);
  });

  it('honors a typical nanoid-shaped incoming id', () => {
    const incomingId = 'V1StGXR8_Z5jdHi6B-myT';
    const req = mockReq({ 'x-request-id': incomingId });
    const res = mockRes();
    const next = vi.fn();

    requestId(req, res, next);

    expect(req.requestId).toBe(incomingId);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', incomingId);
  });

  it('honors a typical UUID-shaped incoming id', () => {
    const incomingId = '550e8400-e29b-41d4-a716-446655440000';
    const req = mockReq({ 'x-request-id': incomingId });
    const res = mockRes();
    const next = vi.fn();

    requestId(req, res, next);

    expect(req.requestId).toBe(incomingId);
  });

  it('honors an inbound id at exactly the maximum allowed length', () => {
    const incomingId = 'a'.repeat(128);
    const req = mockReq({ 'x-request-id': incomingId });
    const res = mockRes();
    const next = vi.fn();

    requestId(req, res, next);

    expect(req.requestId).toBe(incomingId);
    expect(req.requestId.length).toBe(128);
  });

  it('rejects an inbound id containing a CRLF injection attempt', () => {
    const unsafe = 'safe-id\r\nX-Injected-Header: evil';
    const req = mockReq({ 'x-request-id': unsafe });
    const res = mockRes();
    const next = vi.fn();

    requestId(req, res, next);

    expect(req.requestId).not.toBe(unsafe);
    expect(req.requestId).not.toContain('\r');
    expect(req.requestId).not.toContain('\n');
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.requestId);
  });

  it('rejects an inbound id containing a NUL byte', () => {
    const unsafe = 'safe-id\u0000evil';
    const req = mockReq({ 'x-request-id': unsafe });
    const res = mockRes();
    const next = vi.fn();

    requestId(req, res, next);

    expect(req.requestId).not.toBe(unsafe);
    expect(req.requestId).not.toContain('\u0000');
    expect(typeof req.requestId).toBe('string');
    expect(req.requestId.length).toBeGreaterThan(0);
  });

  it('generates a new id when incoming x-request-id contains invalid characters', () => {
    const unsafe = 'id with spaces and invalid 🚀 chars';
    const req = mockReq({ 'x-request-id': unsafe });
    const res = mockRes();
    const next = vi.fn();

    requestId(req, res, next);

    expect(req.requestId).not.toBe(unsafe);
    expect(typeof req.requestId).toBe('string');
    expect(req.requestId.length).toBeGreaterThan(0);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.requestId);
  });

  it('generates a new id when incoming x-request-id is too long', () => {
    const tooLong = 'a'.repeat(129);
    const req = mockReq({ 'x-request-id': tooLong });
    const res = mockRes();
    const next = vi.fn();

    requestId(req, res, next);

    expect(req.requestId).not.toBe(tooLong);
    expect(req.requestId.length).toBeLessThanOrEqual(128);
  });

  it('generates a new id when incoming x-request-id is empty', () => {
    const req = mockReq({ 'x-request-id': '' });
    const res = mockRes();
    const next = vi.fn();

    requestId(req, res, next);

    expect(typeof req.requestId).toBe('string');
    expect(req.requestId.length).toBeGreaterThan(0);
  });
});
