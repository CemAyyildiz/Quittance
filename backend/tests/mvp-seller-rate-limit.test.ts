/**
 * mvp-seller-rate-limit.test.ts
 *
 * End-to-end coverage for per-seller create and per-invoice verify rate
 * limits on the MVP demo backend (issue #1010).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Server } from 'http';

process.env.SELLER_RATE_LIMIT_MAX = '3';
process.env.SELLER_RATE_LIMIT_WINDOW_MS = '60000';
delete process.env.SELLER_RATE_LIMIT_ENABLED;

const SELLER_A = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const SELLER_B = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const PAYER = 'GDRRIS6OAOVMDEN6SAXNSIVAA5PLH4MBX77Y4MOE7QYGO3K2DQII7CIB';
const TX_HASH = 'b'.repeat(64);

const getTransaction = vi.fn();

vi.mock('../src/services/stellar.service', () => ({
  default: {
    getTransaction: (hash: string) => getTransaction(hash),
    checkSellerAccountForAsset: async () => ({ ok: true }),
  },
  HorizonUnavailableError: class HorizonUnavailableError extends Error {},
  UnfundedAccountError: class UnfundedAccountError extends Error {},
}));

const { default: app } = await import('../src/server-mvp');
const { default: memoryStorage } = await import('../src/storage/memory-storage');
const { clearRateLimitStore } = await import('../src/middleware/rate-limit-stub');

let server: Server;
let baseUrl: string;

async function call(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<{ status: number; body: any; headers: Headers }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    body: (await response.json()) as any,
    headers: response.headers,
  };
}

function createBody(sellerPublicKey: string) {
  return {
    amount: 1.5,
    assetCode: 'XLM',
    sellerPublicKey,
  };
}

beforeEach(async () => {
  memoryStorage.clear();
  clearRateLimitStore();
  getTransaction.mockReset();

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('MVP seller create rate limit', () => {
  it('returns 429 after the seller create limit and does not write another invoice', async () => {
    for (let i = 0; i < 3; i++) {
      const ok = await call('POST', '/api/invoices', createBody(SELLER_A));
      expect(ok.status).toBe(201);
    }

    expect(memoryStorage.getAllInvoices().length).toBe(3);

    const limited = await call('POST', '/api/invoices', createBody(SELLER_A));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toMatch(/^\d+$/);
    expect(limited.body).toMatchObject({
      success: false,
      retryAfter: expect.any(Number),
    });
    expect(memoryStorage.getAllInvoices().length).toBe(3);
  });

  it('does not block a different seller when one seller is limited', async () => {
    for (let i = 0; i < 3; i++) {
      const ok = await call('POST', '/api/invoices', createBody(SELLER_A));
      expect(ok.status).toBe(201);
    }

    const limited = await call('POST', '/api/invoices', createBody(SELLER_A));
    expect(limited.status).toBe(429);

    const other = await call('POST', '/api/invoices', createBody(SELLER_B));
    expect(other.status).toBe(201);
    expect(other.body.data.invoice.sellerPublicKey).toBe(SELLER_B);
    expect(memoryStorage.getAllInvoices().length).toBe(4);
  });

  it('returns 400 (not 429) for a missing or invalid seller key', async () => {
    const missing = await call('POST', '/api/invoices', { amount: 1 });
    expect(missing.status).toBe(400);
    expect(missing.headers.get('Retry-After')).toBeNull();

    const invalid = await call('POST', '/api/invoices', {
      amount: 1,
      sellerPublicKey: 'not-a-key',
    });
    expect(invalid.status).toBe(400);
    expect(invalid.headers.get('Retry-After')).toBeNull();
    expect(memoryStorage.getAllInvoices().length).toBe(0);
  });

  it('does not count health routes against the seller create limit', async () => {
    for (let i = 0; i < 10; i++) {
      const health = await call('GET', '/api/health');
      expect(health.status).toBe(200);
    }

    for (let i = 0; i < 3; i++) {
      const ok = await call('POST', '/api/invoices', createBody(SELLER_A));
      expect(ok.status).toBe(201);
    }
  });
});

describe('MVP invoice verify rate limit', () => {
  it('returns 429 after the per-invoice verify limit without calling Horizon', async () => {
    const created = await call('POST', '/api/invoices', createBody(SELLER_A));
    expect(created.status).toBe(201);
    const invoiceId = created.body.data.invoice.id as string;

    getTransaction.mockResolvedValue({
      transaction: { memo: created.body.data.invoice.memo, memo_type: 'text' },
      operations: [
        {
          type: 'payment',
          to: SELLER_A,
          from: PAYER,
          amount: '1.5000000',
          asset_type: 'native',
        },
      ],
    });

    // Burn the verify quota with requests that fail validation before Horizon
    // would matter; after the limit Horizon must never be touched.
    for (let i = 0; i < 3; i++) {
      const res = await call('POST', `/api/invoices/${invoiceId}/verify`, {
        txHash: TX_HASH,
      });
      // First call may succeed (201/200) or fail validation; either consumes quota.
      expect([200, 400]).toContain(res.status);
    }

    getTransaction.mockClear();

    const limited = await call('POST', `/api/invoices/${invoiceId}/verify`, {
      txHash: TX_HASH,
    });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toMatch(/^\d+$/);
    expect(getTransaction).not.toHaveBeenCalled();
  });
});
