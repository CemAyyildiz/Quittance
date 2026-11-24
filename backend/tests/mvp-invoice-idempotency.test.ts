/**
 * mvp-invoice-idempotency.test.ts
 *
 * Idempotency-Key support on invoice create for the MVP backend (issue #1021).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Server } from 'http';

process.env.SELLER_RATE_LIMIT_ENABLED = 'false';

const SELLER_A = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const SELLER_B = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

const { default: app } = await import('../src/server-mvp');
const { default: memoryStorage } = await import('../src/storage/memory-storage');
const { clearIdempotencyStore } = await import('../src/utils/idempotency');

let server: Server;
let baseUrl: string;

async function create(
  body: unknown,
  idempotencyKey?: string,
): Promise<{ status: number; body: any; headers: Headers }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (idempotencyKey !== undefined) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  const response = await fetch(`${baseUrl}/api/invoices`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return {
    status: response.status,
    body: (await response.json()) as any,
    headers: response.headers,
  };
}

function createBody(sellerPublicKey: string, extra: Record<string, unknown> = {}) {
  return { amount: 1.5, assetCode: 'XLM', sellerPublicKey, ...extra };
}

beforeEach(async () => {
  memoryStorage.clear();
  clearIdempotencyStore();

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

describe('MVP invoice create Idempotency-Key', () => {
  it('returns the original invoice for the same seller and key and stores one invoice', async () => {
    const first = await create(createBody(SELLER_A), 'submit-1');
    const second = await create(createBody(SELLER_A), 'submit-1');

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.invoice.id).toBe(first.body.data.invoice.id);
    expect(second.body.data.invoice.memo).toBe(first.body.data.invoice.memo);
    expect(second.body.data.paymentUrl).toBe(first.body.data.paymentUrl);
    expect(first.headers.get('Idempotent-Replayed')).toBeNull();
    expect(second.headers.get('Idempotent-Replayed')).toBe('true');
    expect(memoryStorage.getAllInvoices().length).toBe(1);
  });

  it('creates one invoice when the same key is submitted concurrently', async () => {
    const results = await Promise.all([
      create(createBody(SELLER_A), 'double-click'),
      create(createBody(SELLER_A), 'double-click'),
      create(createBody(SELLER_A), 'double-click'),
    ]);

    for (const result of results) {
      expect(result.status).toBe(201);
    }
    const ids = new Set(results.map((r) => r.body.data.invoice.id));
    expect(ids.size).toBe(1);
    expect(memoryStorage.getAllInvoices().length).toBe(1);
  });

  it('creates a new invoice for a different key', async () => {
    const first = await create(createBody(SELLER_A), 'key-a');
    const second = await create(createBody(SELLER_A), 'key-b');

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.invoice.id).not.toBe(first.body.data.invoice.id);
    expect(second.body.data.invoice.memo).not.toBe(first.body.data.invoice.memo);
    expect(memoryStorage.getAllInvoices().length).toBe(2);
  });

  it('creates a new invoice on every request without a key', async () => {
    const first = await create(createBody(SELLER_A));
    const second = await create(createBody(SELLER_A));

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.invoice.id).not.toBe(first.body.data.invoice.id);
    expect(memoryStorage.getAllInvoices().length).toBe(2);
  });

  it("does not return another seller's invoice for the same key", async () => {
    const sellerA = await create(createBody(SELLER_A), 'shared-key');
    const sellerB = await create(createBody(SELLER_B), 'shared-key');

    expect(sellerA.status).toBe(201);
    expect(sellerB.status).toBe(201);
    expect(sellerB.body.data.invoice.id).not.toBe(sellerA.body.data.invoice.id);
    expect(sellerB.body.data.invoice.sellerPublicKey).toBe(SELLER_B);
    expect(sellerB.headers.get('Idempotent-Replayed')).toBeNull();
    expect(memoryStorage.getAllInvoices().length).toBe(2);
  });

  it('creates once when a key is retried after a 400', async () => {
    const failed = await create(createBody(SELLER_A, { amount: -1 }), 'retry-key');
    expect(failed.status).toBe(400);
    expect(memoryStorage.getAllInvoices().length).toBe(0);

    const retried = await create(createBody(SELLER_A), 'retry-key');
    expect(retried.status).toBe(201);
    expect(retried.headers.get('Idempotent-Replayed')).toBeNull();

    const replay = await create(createBody(SELLER_A), 'retry-key');
    expect(replay.status).toBe(201);
    expect(replay.body.data.invoice.id).toBe(retried.body.data.invoice.id);
    expect(memoryStorage.getAllInvoices().length).toBe(1);
  });

  it('accepts a 128-character key and rejects a longer one with 400', async () => {
    const ok = await create(createBody(SELLER_A), 'k'.repeat(128));
    expect(ok.status).toBe(201);

    const tooLong = await create(createBody(SELLER_A), 'k'.repeat(129));
    expect(tooLong.status).toBe(400);
    expect(tooLong.body).toMatchObject({ success: false });
    expect(tooLong.body.error).toMatch(/128/);
    expect(memoryStorage.getAllInvoices().length).toBe(1);
  });
});
