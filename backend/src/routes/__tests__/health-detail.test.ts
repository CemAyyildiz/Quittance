import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import express, { Express } from 'express';
import type { Server } from 'http';

vi.mock('../../services/stellar.service', () => ({
  default: {
    checkHorizonHealth: vi.fn(),
  },
}));

import healthDetailRouter from '../health-detail';
import stellarService from '../../services/stellar.service';

const checkHorizonHealth = vi.mocked(stellarService.checkHorizonHealth);

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

  beforeEach(() => {
    checkHorizonHealth.mockResolvedValue({
      reachable: true,
      latestLedger: 5_432_100,
    });
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    checkHorizonHealth.mockReset();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      server = undefined as unknown as Server;
    }
  });

  it('returns the full health-detail JSON response shape when Horizon is up', async () => {
    const { status, body } = await request();

    expect(status).toBe(200);
    expect(body).toMatchObject({
      status: 'ok',
      network: expect.any(String),
      latestLedger: 5_432_100,
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

  it('returns 503 when Horizon is unreachable', async () => {
    checkHorizonHealth.mockResolvedValue({ reachable: false });

    const { status, body } = await request();

    expect(status).toBe(503);
    expect(body.status).toBe('error');
    expect(body.message).toBe('Horizon unreachable');
    expect(body.latestLedger).toBeUndefined();
  });

  it('returns 503 when the Horizon probe times out', async () => {
    checkHorizonHealth.mockResolvedValue({ reachable: false });

    const { status, body } = await request();

    expect(status).toBe(503);
    expect(body.message).toBe('Horizon unreachable');
  });

  it('does not leak secrets in the response', async () => {
    vi.stubEnv('SELLER_SECRET_KEY', 'SSECRETVALUE');
    vi.stubEnv('STELLAR_SECRET', 'another-secret');

    const { body } = await request();
    const serialized = JSON.stringify(body);

    expect(serialized).not.toContain('SSECRETVALUE');
    expect(serialized).not.toContain('another-secret');
    expect(body).not.toHaveProperty('SELLER_SECRET_KEY');
    expect(body).not.toHaveProperty('secret');
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

  it('reports the service name and version', async () => {
    const { body } = await request();

    expect(body.service).toBe('Quittance API');
    expect(body.version).toBe('1.0.0');
  });

  it('exposes the health and detail endpoint paths', async () => {
    const { body } = await request();

    expect(body.endpoints).toEqual({
      health: '/api/health',
      detail: '/api/health/detail',
    });
  });
});
