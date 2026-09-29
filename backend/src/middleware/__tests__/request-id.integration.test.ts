import { describe, it, expect } from 'vitest';
import express, { type Request, type Response } from 'express';
import type { Server } from 'http';
import { requestId } from '../request-id';

function buildApp() {
  const app = express();
  app.use(requestId);
  app.get('/echo', (req: Request, res: Response) => {
    res.json({ requestId: req.requestId });
  });
  return app;
}

async function withServer<T>(
  app: express.Express,
  run: (port: number) => Promise<T>,
): Promise<T> {
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  try {
    const { port } = server.address() as { port: number };
    return await run(port);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function get(
  port: number,
  path: string,
  headers: Record<string, string> = {},
) {
  return fetch(`http://127.0.0.1:${port}${path}`, { headers });
}

describe('requestId middleware (integration)', () => {
  it('attaches the id on the request and echoes it back via the x-request-id header', async () => {
    await withServer(buildApp(), async (port) => {
      const res = await get(port, '/echo');
      const header = res.headers.get('x-request-id');
      const body = (await res.json()) as { requestId: string };

      expect(header).toBeTruthy();
      expect(body.requestId).toBe(header);
      expect(header).toMatch(/^[A-Za-z0-9._-]+$/);
    });
  });

  it('propagates a safe incoming x-request-id across both the response header and the body', async () => {
    await withServer(buildApp(), async (port) => {
      const incoming = 'client-correlation-id-123';
      const res = await get(port, '/echo', { 'x-request-id': incoming });
      const body = (await res.json()) as { requestId: string };

      expect(res.headers.get('x-request-id')).toBe(incoming);
      expect(body.requestId).toBe(incoming);
    });
  });

  it('ignores an unsafe incoming x-request-id and returns a generated one instead', async () => {
    await withServer(buildApp(), async (port) => {
      const unsafe = 'id with spaces';
      const res = await get(port, '/echo', { 'x-request-id': unsafe });
      const body = (await res.json()) as { requestId: string };

      expect(body.requestId).not.toBe(unsafe);
      expect(res.headers.get('x-request-id')).toBe(body.requestId);
      expect(body.requestId).toMatch(/^[A-Za-z0-9._-]+$/);
    });
  });

  it('ignores an oversized incoming x-request-id and returns a generated one instead', async () => {
    await withServer(buildApp(), async (port) => {
      const oversized = 'a'.repeat(129);
      const res = await get(port, '/echo', { 'x-request-id': oversized });
      const body = (await res.json()) as { requestId: string };

      expect(body.requestId.length).toBeLessThanOrEqual(128);
      expect(body.requestId).not.toBe(oversized);
    });
  });
});
