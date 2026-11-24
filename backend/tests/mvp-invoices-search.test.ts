/**
 * mvp-invoices-search.test.ts
 *
 * Covers seller-scoped search on `GET /api/invoices`: search is applied before
 * paging, memo matching is exact (case-insensitive), short queries are rejected,
 * and another seller's invoices never match.
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

function seed(overrides: Record<string, unknown> = {}) {
  seq += 1;
  return memoryStorage.createInvoice({
    sellerPublicKey: SELLER,
    amount: seq,
    assetCode: 'XLM',
    memo: `SEARCH-${seq}`,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ...overrides,
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

describe('GET /api/invoices seller search', () => {
  it('matches invoices outside the first unfiltered page', async () => {
    const acme = [
      seed({ customerName: 'Acme Ltd' }),
      seed({ customerName: 'Acme Ltd' }),
    ];
    const fillers = [seed({ customerName: 'Filler Co' }), seed({ customerName: 'Filler Co' })];

    // Give the fillers newer timestamps so Acme sits on page two without search.
    const now = Date.now();
    acme.forEach((inv, index) => {
      memoryStorage.updateInvoice(inv.id, { createdAt: new Date(now - 10_000 + index) });
    });
    fillers.forEach((inv, index) => {
      memoryStorage.updateInvoice(inv.id, { createdAt: new Date(now - 1_000 + index) });
    });

    const first = await list(`sellerPublicKey=${SELLER}&search=acme&limit=1`);
    expect(first.status).toBe(200);
    expect(first.body.data).toHaveLength(1);
    expect(first.body.data[0].customerName).toBe('Acme Ltd');
    expect(first.body.pagination.nextCursor).toBeTruthy();

    const second = await list(
      `sellerPublicKey=${SELLER}&search=acme&limit=1&cursor=${first.body.pagination.nextCursor}`,
    );
    expect(second.body.data).toHaveLength(1);
    expect(second.body.data[0].customerName).toBe('Acme Ltd');
    expect(second.body.pagination.nextCursor).toBeUndefined();

    const returned = [...first.body.data, ...second.body.data].map((inv: any) => inv.id);
    expect(new Set(returned)).toEqual(new Set(acme.map((inv) => inv.id)));
  });

  it('matches a memo exactly instead of as a substring', async () => {
    seed({ memo: 'INV-XYZ-999' });

    const substring = await list(`sellerPublicKey=${SELLER}&search=xyz`);
    expect(substring.status).toBe(200);
    expect(substring.body.data).toHaveLength(0);

    const exact = await list(`sellerPublicKey=${SELLER}&search=inv-xyz-999`);
    expect(exact.body.data).toHaveLength(1);
  });

  it('matches an invoice number (id) prefix', async () => {
    const invoice = seed();

    const { body } = await list(
      `sellerPublicKey=${SELLER}&search=${invoice.id.slice(0, 8)}`,
    );

    expect(body.data.map((inv: any) => inv.id)).toContain(invoice.id);
  });

  it('rejects a one-character query', async () => {
    seed({ customerName: 'Acme Ltd' });

    const { status, body } = await list(`sellerPublicKey=${SELLER}&search=a`);

    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('never returns another seller’s matching invoice', async () => {
    seed({ sellerPublicKey: OTHER_SELLER, customerName: 'Acme Ltd' });
    const own = seed({ customerName: 'Acme Ltd' });

    const { body } = await list(`sellerPublicKey=${SELLER}&search=acme`);

    expect(body.data.map((inv: any) => inv.id)).toEqual([own.id]);
  });
});
