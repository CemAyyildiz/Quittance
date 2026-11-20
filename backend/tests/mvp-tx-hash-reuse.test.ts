/**
 * mvp-tx-hash-reuse.test.ts
 *
 * The MVP verify endpoint is driven over HTTP (ephemeral port, Horizon mocked)
 * to prove a transaction hash can settle at most one invoice:
 *
 * - a hash already stored on invoice A is refused for invoice B,
 * - invoice B keeps its previous status,
 * - the error names the problem and does not leak the other customer's email,
 * - retrying invoice A itself is not reported as a reuse,
 * - two different hashes still pay two invoices.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Server } from 'http';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const PAYER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const TX_HASH_A = 'c'.repeat(64);
const TX_HASH_B = 'd'.repeat(64);

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

function seedInvoice(customerEmail?: string) {
  memoCounter += 1;
  return memoryStorage.createInvoice({
    sellerPublicKey: SELLER,
    amount: 1.5,
    assetCode: 'XLM',
    memo: `REUSE-${memoCounter}`,
    customerEmail,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}

function matchingHorizonTx(memo: string) {
  return {
    transaction: { memo, source_account: PAYER },
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

async function verify(invoiceId: string, txHash: string) {
  return call('POST', `/api/invoices/${invoiceId}/verify`, { txHash });
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

describe('MVP transaction hash reuse', () => {
  it('refuses a hash already stored on another invoice and leaves it pending', async () => {
    const invoiceA = seedInvoice('client-a@example.com');
    const invoiceB = seedInvoice('client-b@example.com');
    getTransaction.mockResolvedValue(matchingHorizonTx(invoiceA.memo));

    const paid = await verify(invoiceA.id, TX_HASH_A);
    expect(paid.status).toBe(200);
    expect(paid.body.data.status).toBe('PAID');

    const reuse = await verify(invoiceB.id, TX_HASH_A);

    expect(reuse.status).toBe(400);
    expect(reuse.body.code).toBe('TX_HASH_ALREADY_USED');
    expect(reuse.body.error).toBe('This transaction hash has already been used.');

    // No other invoice data (and no customer email) is returned.
    const payload = JSON.stringify(reuse.body);
    expect(payload).not.toContain('client-a@example.com');
    expect(payload).not.toContain('client-b@example.com');
    expect(reuse.body.data).toBeUndefined();

    const after = await call('GET', `/api/invoices/${invoiceB.id}`);
    expect(after.body.data.status).toBe('PENDING');
  });

  it('refuses the reused hash before contacting Horizon', async () => {
    const invoiceA = seedInvoice();
    const invoiceB = seedInvoice();
    getTransaction.mockResolvedValue(matchingHorizonTx(invoiceA.memo));

    await verify(invoiceA.id, TX_HASH_A);
    expect(getTransaction).toHaveBeenCalledTimes(1);

    await verify(invoiceB.id, TX_HASH_A);

    // The known hash is answered from storage; no second Horizon lookup.
    expect(getTransaction).toHaveBeenCalledTimes(1);
  });

  it('does not report a retry on the invoice holding the hash as a reuse', async () => {
    const invoiceA = seedInvoice();
    const invoiceB = seedInvoice();
    getTransaction.mockResolvedValue(matchingHorizonTx(invoiceA.memo));

    await verify(invoiceA.id, TX_HASH_A);
    const retry = await verify(invoiceA.id, TX_HASH_A);

    expect(retry.body.code).toBe('INVOICE_ALREADY_PAID');
    expect(retry.body.code).not.toBe('TX_HASH_ALREADY_USED');

    // Invoice B is untouched by the retry.
    const after = await call('GET', `/api/invoices/${invoiceB.id}`);
    expect(after.body.data.status).toBe('PENDING');
  });

  it('still lets two different hashes pay two invoices', async () => {
    const invoiceA = seedInvoice();
    const invoiceB = seedInvoice();

    getTransaction.mockResolvedValueOnce(matchingHorizonTx(invoiceA.memo));
    const paidA = await verify(invoiceA.id, TX_HASH_A);

    getTransaction.mockResolvedValueOnce(matchingHorizonTx(invoiceB.memo));
    const paidB = await verify(invoiceB.id, TX_HASH_B);

    expect(paidA.status).toBe(200);
    expect(paidB.status).toBe(200);

    const afterA = await call('GET', `/api/invoices/${invoiceA.id}`);
    const afterB = await call('GET', `/api/invoices/${invoiceB.id}`);
    expect(afterA.body.data.status).toBe('PAID');
    expect(afterB.body.data.status).toBe('PAID');
  });
});
