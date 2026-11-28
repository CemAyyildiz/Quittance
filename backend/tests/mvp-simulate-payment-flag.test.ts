import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Application } from 'express';
import type { Server } from 'node:http';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';

let server: Server | undefined;

async function loadApp(allowSimulate: boolean) {
  vi.resetModules();
  process.env.NODE_ENV = 'test';
  if (allowSimulate) {
    process.env.ALLOW_SIMULATE = 'true';
  } else {
    delete process.env.ALLOW_SIMULATE;
  }

  const [{ default: app }, { default: storage }] = await Promise.all([
    import('../src/server-mvp'),
    import('../src/storage/memory-storage'),
  ]);
  storage.clear();
  return { app, storage };
}

async function listen(app: Application) {
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  return `http://127.0.0.1:${port}`;
}

function seedInvoice(storage: Awaited<ReturnType<typeof loadApp>>['storage']) {
  return storage.createInvoice({
    sellerPublicKey: SELLER,
    amount: 12,
    assetCode: 'XLM',
    memo: `SIM-${Date.now()}`,
    expiresAt: new Date(Date.now() + 86_400_000),
  });
}

async function post(baseUrl: string, invoiceId: string) {
  const response = await fetch(`${baseUrl}/api/invoices/${invoiceId}/simulate-payment`, {
    method: 'POST',
  });
  return { status: response.status, body: await response.json() };
}

beforeEach(() => {
  delete process.env.ALLOW_SIMULATE;
});

afterEach(async () => {
  delete process.env.ALLOW_SIMULATE;
  if (server) {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = undefined;
  }
});

describe('MVP simulated-payment flag', () => {
  it('returns 404 and leaves a pending invoice unchanged when the flag is unset', async () => {
    const { app, storage } = await loadApp(false);
    const invoice = seedInvoice(storage);
    const baseUrl = await listen(app);

    const result = await post(baseUrl, invoice.id);

    expect(result.status).toBe(404);
    expect(storage.getInvoiceById(invoice.id)?.status).toBe('PENDING');
    expect(storage.getInvoiceById(invoice.id)?.paymentTxHash).toBeUndefined();
  }, 15_000);

  it('keeps local simulation available only when ALLOW_SIMULATE=true', async () => {
    const { app, storage } = await loadApp(true);
    const invoice = seedInvoice(storage);
    const baseUrl = await listen(app);

    const result = await post(baseUrl, invoice.id);

    expect(result.status).toBe(200);
    expect((result.body as { data: { status: string } }).data.status).toBe('PAID');
    expect(storage.getInvoiceById(invoice.id)?.status).toBe('PAID');
    expect(storage.getInvoiceById(invoice.id)?.paymentTxHash).toMatch(/^MOCK_TX_/);
  }, 15_000);

});
