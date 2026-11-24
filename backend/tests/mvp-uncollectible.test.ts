import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Server } from 'http';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const OTHER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

const { default: app } = await import('../src/server-mvp');
const { default: memoryStorage } = await import('../src/storage/memory-storage');

let server: Server;
let baseUrl: string;

async function call(path: string, body: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() as any };
}

beforeEach(async () => {
  memoryStorage.clear();
  await new Promise<void>((resolve) => { server = app.listen(0, resolve); });
  const address = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function seed() {
  return memoryStorage.createInvoice({
    sellerPublicKey: SELLER,
    amount: 10,
    assetCode: 'XLM',
    memo: `UNC-${Date.now()}-${Math.random()}`,
  });
}

describe('MVP uncollectible invoices', () => {
  it('lets the owner mark a pending invoice uncollectible and is idempotent', async () => {
    const invoice = seed();
    const first = await call(`/api/invoices/${invoice.id}/uncollectible`, { sellerPublicKey: SELLER });
    const second = await call(`/api/invoices/${invoice.id}/uncollectible`, { sellerPublicKey: SELLER });

    expect(first.status).toBe(200);
    expect(first.body.data.status).toBe('UNCOLLECTIBLE');
    expect(second.status).toBe(200);
    expect(second.body.data.status).toBe('UNCOLLECTIBLE');
  });

  it('returns 404 to another wallet without changing the invoice', async () => {
    const invoice = seed();
    const result = await call(`/api/invoices/${invoice.id}/uncollectible`, { sellerPublicKey: OTHER });

    expect(result.status).toBe(404);
    expect(memoryStorage.getInvoiceById(invoice.id)?.status).toBe('PENDING');
  });

  it('rejects paid invoices', async () => {
    const invoice = seed();
    memoryStorage.markAsPaid(invoice.id, 'tx-paid', OTHER, { ledger: 1 });
    const result = await call(`/api/invoices/${invoice.id}/uncollectible`, { sellerPublicKey: SELLER });

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('NOT_PENDING');
    expect(memoryStorage.getInvoiceById(invoice.id)?.status).toBe('PAID');
  });

  it('blocks verification before Horizon for an uncollectible invoice', async () => {
    const invoice = seed();
    memoryStorage.markUncollectible(invoice.id);
    const result = await call(`/api/invoices/${invoice.id}/verify`, { txHash: 'tx-never-looked-up' });

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('INVOICE_NOT_PENDING');
  });
});
