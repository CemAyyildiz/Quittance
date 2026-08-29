import { describe, it, expect, vi } from 'vitest';
import { asyncHandler } from '../async-handler';

function mockReq() {
  return {} as any;
}

function mockRes() {
  return { json: vi.fn(), status: vi.fn().mockReturnThis() } as any;
}

describe('asyncHandler middleware', () => {
  it('does not forward a resolved handler to next(err), letting it respond', async () => {
    const handler = vi.fn(async (_req: any, res: any) => {
      res.json({ ok: true });
    });
    const wrapped = asyncHandler(handler);
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    wrapped(req, res, next);

    await vi.waitFor(() => expect(handler).toHaveBeenCalledOnce());
    // A successful handler produces its own response; the wrapper must not
    // treat it as an error and must not call next(err).
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards a rejected handler to next(err)', async () => {
    const boom = new Error('boom');
    const handler = vi.fn(async () => {
      throw boom;
    });
    const wrapped = asyncHandler(handler);
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    wrapped(req, res, next);

    await vi.waitFor(() => expect(next).toHaveBeenCalled());
    expect(next).toHaveBeenCalledWith(boom);
    // The handler error must never be turned into a response by the wrapper.
    expect(res.json).not.toHaveBeenCalled();
  });

  it('passes the request, response and next through to the handler', async () => {
    const handler = vi.fn(async () => {});
    const wrapped = asyncHandler(handler);
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    wrapped(req, res, next);

    await vi.waitFor(() => expect(handler).toHaveBeenCalledOnce());
    expect(handler).toHaveBeenCalledWith(req, res, next);
  });
});