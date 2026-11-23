/**
 * mvp-invoices-pagination.test.ts
 *
 * Covers the seller-scoped cursor pagination of `GET /api/invoices` on the MVP
 * backend: page walking, limit clamping, unknown-cursor rejection, and seller
 * isolation. The server is booted on an ephemeral port so assertions are about
 * the HTTP contract.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Server } from 'http';

const SELLER = 'G' + 'A'.repeat(55);
const OTHER_SELLER = 'G' + 'B'.repeat(55);

const { default: app } = await import('../src/server-mvp');
const { default: memoryStorage } = await import('../src/storage/memory-storage');

let server: Server;
let baseUrl: string;
let seq = 0;

function seed(sellerPublicKey: string = SELLER) {
  seq += 1;
  return memoryStorage.createInvoice({
    sellerPublicKey,
    amount: seq,
    assetCode: 'XLM',
    memo: `PAGE-${seq}`,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}

async function list(query: string) {
  const response = await fetch(`${baseUrl}/api/invoices?${query}`);
  return { status: response.status, body: (await response.json()) as any };
}

beforeEach(async () => {
  memoryStorage.clear();
  seq = 0;

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

describe('GET /api/invoices cursor pagination', () => {
  it('walks two pages without duplicates and never leaks another seller', async () => {
    const own = [seed(), seed(), seed()];
    const foreign = [seed(OTHER_SELLER), seed(OTHER_SELLER)];

    const first = await list(`sellerPublicKey=${SELLER}&limit=2`);
    expect(first.status).toBe(200);
    expect(first.body.data).toHaveLength(2);
    expect(first.body.data.every((inv: any) => inv.sellerPublicKey === SELLER)).toBe(true);
    expect(first.body.pagination.nextCursor).toBeTruthy();

    const second = await list(
      `sellerPublicKey=${SELLER}&limit=2&cursor=${first.body.pagination.nextCursor}`,
    );
    expect(second.status).toBe(200);
    expect(second.body.data).toHaveLength(1);
    expect(second.body.pagination.nextCursor).toBeUndefined();

    const ids = [...first.body.data, ...second.body.data].map((inv: any) => inv.id);
    expect(new Set(ids).size).toBe(own.length);
    expect(new Set(ids)).toEqual(new Set(own.map((inv) => inv.id)));
    expect(ids.some((id: string) => foreign.some((inv) => inv.id === id))).toBe(false);
  });

  it('clamps a limit above the maximum page size', async () => {
    seed();

    const { status, body } = await list(`sellerPublicKey=${SELLER}&limit=1000`);

    expect(status).toBe(200);
    expect(body.pagination.limit).toBe(100);
  });

  it('rejects an unknown cursor with 400 instead of returning the first page', async () => {
    seed();

    const { status, body } = await list(
      `sellerPublicKey=${SELLER}&cursor=00000000-0000-0000-0000-000000000000`,
    );

    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("rejects another seller's cursor so pages stay seller-scoped", async () => {
    seed();
    const foreign = seed(OTHER_SELLER);

    const { status } = await list(`sellerPublicKey=${SELLER}&cursor=${foreign.id}`);

    expect(status).toBe(400);
  });
});
