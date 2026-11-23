import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'http';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const OTHER_SELLER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const PAYER = 'GB6YV2S6MIH6BTVQW5NGAF4M47UTP3TUKZM2YJLOF66WHWZ2IY2W2VKJ';
const TX_HASH = 'a'.repeat(64);

const getTransaction = vi.fn();

vi.mock('../src/services/stellar.service', () => ({
  default: {
    getTransaction: (hash: string) => getTransaction(hash),
  },
}));

const { default: app } = await import('../src/server-mvp');
const { default: memoryStorage } = await import('../src/storage/memory-storage');

let server: Server;
let baseUrl: string;
let memoCounter = 0;

function seedInvoice(status: 'PENDING' | 'PAID' = 'PENDING') {
  memoCounter += 1;
  const invoice = memoryStorage.createInvoice({
    sellerPublicKey: SELLER,
    amount: 1.5,
    assetCode: 'XLM',
    memo: `VOID-${memoCounter}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  if (status === 'PAID') {
    memoryStorage.markAsPaid(invoice.id, `paid-${memoCounter}`, PAYER);
  }
  return invoice;
}

async function call(method: 'GET' | 'POST', path: string, body?: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: (await response.json()) as any };
}

beforeEach(async () => {
  memoryStorage.clear();
  memoCounter = 0;
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

describe('MVP invoice voiding', () => {
  it('lets the owning seller void a pending invoice idempotently', async () => {
    const invoice = seedInvoice();
    const path = `/api/invoices/${invoice.id}/cancel`;

    const first = await call('POST', path, { sellerPublicKey: SELLER });
    const second = await call('POST', path, { sellerPublicKey: SELLER });

    expect(first.status).toBe(200);
    expect(first.body.data.status).toBe('CANCELLED');
    expect(second.status).toBe(200);
    expect(second.body.data.status).toBe('CANCELLED');
  });

  it('rejects a different wallet without changing the invoice', async () => {
    const invoice = seedInvoice();

    const { status, body } = await call(
      'POST',
      `/api/invoices/${invoice.id}/cancel`,
      { sellerPublicKey: OTHER_SELLER }
    );

    expect(status).toBe(403);
    expect(body.code).toBe('NOT_OWNER');
    expect(memoryStorage.getInvoiceById(invoice.id)?.status).toBe('PENDING');
  });

  it('does not void a paid invoice', async () => {
    const invoice = seedInvoice('PAID');

    const { status, body } = await call(
      'POST',
      `/api/invoices/${invoice.id}/cancel`,
      { sellerPublicKey: SELLER }
    );

    expect(status).toBe(400);
    expect(body.code).toBe('NOT_VOIDABLE');
    expect(memoryStorage.getInvoiceById(invoice.id)?.status).toBe('PAID');
  });

  it('rejects verification of a voided invoice before contacting Horizon', async () => {
    const invoice = seedInvoice();
    await call('POST', `/api/invoices/${invoice.id}/cancel`, {
      sellerPublicKey: SELLER,
    });

    const { status, body } = await call(
      'POST',
      `/api/invoices/${invoice.id}/verify`,
      { txHash: TX_HASH }
    );

    expect(status).toBe(400);
    expect(body.code).toBe('INVOICE_NOT_PENDING');
    expect(getTransaction).not.toHaveBeenCalled();
  });

  it('requires the seller wallet on cancel requests', async () => {
    const invoice = seedInvoice();

    const { status, body } = await call(
      'POST',
      `/api/invoices/${invoice.id}/cancel`,
      {}
    );

    expect(status).toBe(400);
    expect(body.code).toBe('SELLER_REQUIRED');
  });
});
