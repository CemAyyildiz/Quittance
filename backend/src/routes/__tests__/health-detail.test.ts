import { describe, it, expect, vi, afterEach } from 'vitest';
import express, { Express } from 'express';
import type { Server } from 'http';
import healthDetailRouter from '../health-detail';

describe('GET /health/detail', () => {
  let server: Server;

  /**
   * Boot a real Express app mounting the health-detail router on an ephemeral
   * port. Uses HTTP + fetch (Node >= 18) so no supertest dependency is needed
   * and no real DB/Redis is touched.
   */
  async function request(): Promise<{ status: number; body: any }> {
    const app: Express = express();
    app.use(healthDetailRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });

    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    const res = await fetch(`http://127.0.0.1:${port}/health/detail`);
    const body = await res.json();
    return { status: res.status, body };
  }

  afterEach(async () => {
    vi.unstubAllEnvs();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      server = undefined as unknown as Server;
    }
  });

  it('returns the full health-detail JSON response shape', async () => {
    const { status, body } = await request();

    expect(status).toBe(200);
    expect(body).toMatchObject({
      status: 'ok',
      network: expect.any(String),
      timestamp: expect.any(String),
      uptime: {
        seconds: expect.any(Number),
        human: expect.any(String),
      },
    });

    // timestamp should be a valid ISO-8601 string
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);

    // uptime.seconds must be a non-negative integer and uptime.human derived from it
    expect(Number.isInteger(body.uptime.seconds)).toBe(true);
    expect(body.uptime.seconds).toBeGreaterThanOrEqual(0);
  });

  it('honors STELLAR_NETWORK env var for the network field', async () => {
    vi.stubEnv('STELLAR_NETWORK', 'PUBLIC');

    const { body } = await request();

    expect(body.network).toBe('PUBLIC');
  });

  it('defaults network to TESTNET when STELLAR_NETWORK is unset', async () => {
    vi.stubEnv('STELLAR_NETWORK', '');

    const { body } = await request();

    // Empty string is falsy, so the route falls back to TESTNET
    expect(body.network).toBe('TESTNET');
  });

  it('exposes NODE_ENV via the environment field', async () => {
    vi.stubEnv('NODE_ENV', 'test');

    const { body } = await request();

    expect(body.environment).toBe('test');
  });
});