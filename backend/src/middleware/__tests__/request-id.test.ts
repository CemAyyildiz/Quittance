import { describe, it, expect, vi } from 'vitest';
import { requestId } from '../request-id';

describe('requestId', () => {
  it('sets x-request-id header on response', () => {
    const setHeader = vi.fn();
    const req = {} as any;
    const res = { setHeader } as any;
    const next = vi.fn();

    requestId(req, res, next);

    expect(setHeader).toHaveBeenCalledOnce();
    expect(setHeader).toHaveBeenCalledWith('x-request-id', expect.any(String));
  });

  it('attaches a string requestId on request', () => {
    const req = {} as any;
    const res = { setHeader: vi.fn() } as any;
    const next = vi.fn();

    requestId(req, res, next);

    expect(req).toHaveProperty('requestId');
    expect(typeof req.requestId).toBe('string');
    expect(req.requestId.length).toBeGreaterThan(0);
  });

  it('generates a unique id on each call', () => {
    const next = vi.fn();

    const req1: any = {};
    const res1: any = { setHeader: vi.fn() };
    requestId(req1, res1, next);

    const req2: any = {};
    const res2: any = { setHeader: vi.fn() };
    requestId(req2, res2, next);

    expect(req1.requestId).not.toBe(req2.requestId);
  });

  it('calls next', () => {
    const req = {} as any;
    const res = { setHeader: vi.fn() } as any;
    const next = vi.fn();

    requestId(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
