import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'http';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const OTHER_SELLER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

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
  const address = server.address();
  baseUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('MVP duplicate invoice', () => {
  it('duplicates a paid invoice as a new pending invoice without its payment hash', async () => {
    const source = memoryStorage.createInvoice({
      sellerPublicKey: SELLER,
      amount: 12.5,
      assetCode: 'USDC',
      assetIssuer: 'GBBDNYA45PVTXJUFQOZT2YVQ5WWMZE3DGCHHMDD6V7V2XPGGTS3AHFGW',
      memo: 'source-memo',
      description: 'Monthly design work',
      customerName: 'Ada',
      customerEmail: 'ada@example.com',
      lineItems: [{ description: 'Design', amount: 12.5 }],
    });
    memoryStorage.markAsPaid(source.id, 'a'.repeat(64), OTHER_SELLER, { ledger: 1 });

    const result = await call(`/api/invoices/${source.id}/duplicate`, {
      sellerPublicKey: SELLER,
      copyCustomerEmail: false,
    });

    expect(result.status).toBe(201);
    const copy = result.body.data.invoice;
    expect(copy.id).not.toBe(source.id);
    expect(copy.memo).not.toBe(source.memo);
    expect(copy.status).toBe('PENDING');
    expect(copy.paymentTxHash).toBeUndefined();
    expect(copy.customerEmail).toBeUndefined();
    expect(copy.description).toBe(source.description);
    expect(copy.lineItems).toEqual(source.lineItems);
    expect(copy.amount).toBe(source.amount);
    expect(copy.assetIssuer).toBe(source.assetIssuer);
  });

  it('copies customer email only when explicitly requested', async () => {
    const source = memoryStorage.createInvoice({ sellerPublicKey: SELLER, amount: 1, memo: 'email-source', customerEmail: 'ada@example.com' });
    const result = await call(`/api/invoices/${source.id}/duplicate`, { sellerPublicKey: SELLER, copyCustomerEmail: true });
    expect(result.status).toBe(201);
    expect(result.body.data.invoice.customerEmail).toBe('ada@example.com');
  });

  it('duplicates a cancelled invoice as a new pending invoice', async () => {
    const source = memoryStorage.createInvoice({ sellerPublicKey: SELLER, amount: 1, memo: 'cancelled-source' });
    memoryStorage.updateInvoice(source.id, { status: 'CANCELLED' });

    const result = await call(`/api/invoices/${source.id}/duplicate`, { sellerPublicKey: SELLER });

    expect(result.status).toBe(201);
    expect(result.body.data.invoice.id).not.toBe(source.id);
    expect(result.body.data.invoice.status).toBe('PENDING');
  });

  it('returns 404 when another wallet tries to duplicate the invoice', async () => {
    const source = memoryStorage.createInvoice({ sellerPublicKey: SELLER, amount: 1, memo: 'owner-only' });
    const result = await call(`/api/invoices/${source.id}/duplicate`, { sellerPublicKey: OTHER_SELLER });
    expect(result.status).toBe(404);
    expect(result.body.data).toBeUndefined();
  });
});
