/**
 * mvp-invoice-expiry.test.ts
 *
 * End-to-end coverage for invoice expiry on the MVP demo backend (issue #559).
 *
 * The MVP server is booted on an ephemeral port and driven over HTTP, the same
 * way `health-detail.test.ts` does, so the assertions are about what a payer
 * actually receives rather than about internal calls. Horizon is mocked, so the
 * tests are offline and deterministic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Server } from 'http';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const PAYER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const TX_HASH = 'a'.repeat(64);

/** A Horizon transaction that matches whatever memo the invoice carries. */
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

function nextMemo(prefix: string) {
  memoCounter += 1;
  return `${prefix}-${memoCounter}`;
}

/** Creates an invoice directly in storage so `expiresAt` can be set freely. */
function seedInvoice(expiresAt: Date) {
  return memoryStorage.createInvoice({
    sellerPublicKey: SELLER,
    amount: 1.5,
    assetCode: 'XLM',
    memo: nextMemo('EXPIRY'),
    expiresAt,
  });
}

function matchingHorizonTx(memo: string) {
  return {
    transaction: { memo },
    operations: [
      {
        type: 'payment',
        to: SELLER,
        from: PAYER,
        amount: '1.5000000',
        asset_type: 'native',
      },
    ],
  };
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

describe('MVP invoice expiry', () => {
  const yesterday = () => new Date(Date.now() - 24 * 60 * 60 * 1000);
  const nextWeek = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  it('rejects settlement of a past-due invoice with INVOICE_EXPIRED', async () => {
    const invoice = seedInvoice(yesterday());
    getTransaction.mockResolvedValue(matchingHorizonTx(invoice.memo));

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/verify`, {
      txHash: TX_HASH,
    });

    expect(status).toBe(400);
    expect(body.code).toBe('INVOICE_EXPIRED');
  });

  it('decides expiry before contacting Horizon', async () => {
    // The payment would have matched; the invoice being stale is enough.
    const invoice = seedInvoice(yesterday());
    getTransaction.mockResolvedValue(matchingHorizonTx(invoice.memo));

    await call('POST', `/api/invoices/${invoice.id}/verify`, { txHash: TX_HASH });

    expect(getTransaction).not.toHaveBeenCalled();
  });

  it('still settles a valid pending invoice', async () => {
    const invoice = seedInvoice(nextWeek());
    getTransaction.mockResolvedValue(matchingHorizonTx(invoice.memo));

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/verify`, {
      txHash: TX_HASH,
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('PAID');
    expect(getTransaction).toHaveBeenCalledWith(TX_HASH);
  });

  it('reports EXPIRED from the single-invoice endpoint', async () => {
    const invoice = seedInvoice(yesterday());

    const { status, body } = await call('GET', `/api/invoices/${invoice.id}`);

    expect(status).toBe(200);
    expect(body.data.status).toBe('EXPIRED');
  });

  it('never lists a stale PENDING invoice past its expiry', async () => {
    const expired = seedInvoice(yesterday());
    const live = seedInvoice(nextWeek());

    const { body } = await call('GET', `/api/invoices?sellerPublicKey=${SELLER}`);
    const byId = new Map<string, any>(
      (body.data.invoices ?? body.data).map((inv: any) => [inv.id, inv]),
    );

    expect(byId.get(expired.id).status).toBe('EXPIRED');
    expect(byId.get(live.id).status).toBe('PENDING');
  });

  it('counts an expired invoice as expired in the stats endpoint', async () => {
    // This endpoint was unreachable before: `/api/invoices/:id` was registered
    // first and swallowed `/api/invoices/stats` as an id.
    seedInvoice(yesterday());
    seedInvoice(nextWeek());

    const { body } = await call('GET', `/api/invoices/stats?sellerPublicKey=${SELLER}`);
    const stats = body.data[0];

    expect(stats.expired_invoices).toBe(1);
    expect(stats.pending_invoices).toBe(1);
  });

  it('leaves an already-paid invoice alone', async () => {
    // The handler answers INVOICE_ALREADY_PAID before the expiry check runs;
    // this pins that the new check did not take that answer over.
    const invoice = seedInvoice(nextWeek());
    memoryStorage.markAsPaid(invoice.id, TX_HASH, PAYER);

    const { body } = await call('GET', `/api/invoices/${invoice.id}`);
    expect(body.data.status).toBe('PAID');

    getTransaction.mockResolvedValue(matchingHorizonTx(invoice.memo));
    const verify = await call('POST', `/api/invoices/${invoice.id}/verify`, { txHash: TX_HASH });

    expect(verify.status).toBe(400);
    expect(verify.body.code).toBe('INVOICE_ALREADY_PAID');
  });
});
