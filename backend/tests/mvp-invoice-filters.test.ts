import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'http';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const OTHER_SELLER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

const { default: app } = await import('../src/server-mvp');
const { default: memoryStorage } = await import('../src/storage/memory-storage');

let server: Server;
let baseUrl: string;
let memoCounter = 0;

function seedInvoice({
  sellerPublicKey = SELLER,
  assetCode = 'XLM',
  status = 'PENDING',
  createdAt,
}: {
  sellerPublicKey?: string;
  assetCode?: string;
  status?: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
}) {
  memoCounter += 1;
  const invoice = memoryStorage.createInvoice({
    sellerPublicKey,
    amount: 10,
    assetCode,
    memo: `FILTER-${memoCounter}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  return memoryStorage.updateInvoice(invoice.id, {
    status,
    createdAt: new Date(createdAt),
  })!;
}

async function get(path: string) {
  const response = await fetch(`${baseUrl}${path}`);
  return { status: response.status, body: (await response.json()) as any };
}

beforeEach(async () => {
  memoryStorage.clear();
  memoCounter = 0;
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

describe('MVP invoice filters', () => {
  it('applies status, asset, and inclusive date filters without widening seller scope', async () => {
    const expected = seedInvoice({
      assetCode: 'USDC',
      status: 'PAID',
      createdAt: '2026-02-10T12:00:00.000Z',
    });
    const endOfRange = seedInvoice({
      assetCode: 'USDC',
      status: 'PAID',
      createdAt: '2026-02-28T23:59:59.999Z',
    });
    seedInvoice({
      assetCode: 'USDC',
      status: 'PAID',
      createdAt: '2026-03-01T00:00:00.000Z',
    });
    seedInvoice({
      assetCode: 'XLM',
      status: 'PAID',
      createdAt: '2026-02-15T12:00:00.000Z',
    });
    seedInvoice({
      sellerPublicKey: OTHER_SELLER,
      assetCode: 'USDC',
      status: 'PAID',
      createdAt: '2026-02-15T12:00:00.000Z',
    });

    const query = new URLSearchParams({
      sellerPublicKey: SELLER,
      status: 'PAID',
      assetCode: 'USDC',
      createdFrom: '2026-02-10',
      createdTo: '2026-02-28',
    });
    const { status, body } = await get(`/api/invoices?${query}`);

    expect(status).toBe(200);
    expect(
      body.data.map((invoice: { id: string }) => invoice.id).sort()
    ).toEqual([expected.id, endOfRange.id].sort());
  });

  it('rejects unknown statuses', async () => {
    const query = new URLSearchParams({
      sellerPublicKey: SELLER,
      status: 'UNKNOWN',
    });
    const { status, body } = await get(`/api/invoices?${query}`);

    expect(status).toBe(400);
    expect(body.error).toContain('status must be');
  });

  it('rejects an inverted date range', async () => {
    const query = new URLSearchParams({
      sellerPublicKey: SELLER,
      createdFrom: '2026-03-01',
      createdTo: '2026-02-28',
    });
    const { status, body } = await get(`/api/invoices?${query}`);

    expect(status).toBe(400);
    expect(body.error).toContain('createdFrom');
  });

  it('rejects an invalid date filter', async () => {
    const query = new URLSearchParams({
      sellerPublicKey: SELLER,
      createdFrom: '2026-02-31',
    });
    const { status, body } = await get(`/api/invoices?${query}`);

    expect(status).toBe(400);
    expect(body.error).toContain('valid date');
  });

  it('keeps statistics scoped to the requested seller', async () => {
    seedInvoice({ createdAt: '2026-02-10T12:00:00.000Z' });
    seedInvoice({
      sellerPublicKey: OTHER_SELLER,
      createdAt: '2026-02-10T12:00:00.000Z',
    });

    const { status, body } = await get(
      `/api/invoices/stats?sellerPublicKey=${SELLER}`
    );

    expect(status).toBe(200);
    expect(body.data[0].total_invoices).toBe(1);
  });
});
