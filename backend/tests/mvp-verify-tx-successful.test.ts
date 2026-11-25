/**
 * mvp-verify-tx-successful.test.ts
 *
 * The MVP verify endpoint is driven over HTTP (ephemeral port, Horizon mocked)
 * to prove only a successful on-chain payment settles an invoice:
 *
 * - a failed transaction is rejected with TX_FAILED,
 * - a hash Horizon answers 404 for is rejected with TX_NOT_FOUND,
 * - a successful transaction without a payment operation is NO_PAYMENT_OPERATION,
 * - none of the rejections change the invoice,
 * - the success check runs before the amount comparison,
 * - a successful matching payment still marks the invoice paid.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Server } from 'http';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const PAYER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const TX_HASH = 'e'.repeat(64);

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

function seedInvoice() {
  memoCounter += 1;
  return memoryStorage.createInvoice({
    sellerPublicKey: SELLER,
    amount: 1.5,
    assetCode: 'XLM',
    memo: `OK-${memoCounter}`,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}

function horizonTx(
  memo: string,
  options: { successful?: boolean | undefined; amount?: string; opType?: string } = {},
) {
  const { amount = '1.5000000', opType = 'payment' } = options;
  // An explicit `undefined` models a receipt that omits the flag entirely.
  const successful = 'successful' in options ? options.successful : true;

  return {
    transaction: {
      successful,
      memo,
      memo_type: 'text',
      source_account: PAYER,
      ledger_sequence: 12345,
      created_at: new Date().toISOString(),
      valid_before: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    },
    operations: [
      {
        type: opType,
        to: SELLER,
        from: PAYER,
        amount,
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

async function expectStillPending(id: string) {
  const after = await call('GET', `/api/invoices/${id}`);
  expect(after.body.data.status).toBe('PENDING');
  expect(after.body.data.txHash ?? null).toBeNull();
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

describe('MVP verify requires a successful transaction', () => {
  it('rejects a failed transaction and leaves the invoice pending', async () => {
    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(horizonTx(invoice.memo, { successful: false }));

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/verify`, {
      txHash: TX_HASH,
    });

    expect(status).toBe(400);
    expect(body.code).toBe('TX_FAILED');
    await expectStillPending(invoice.id);
  });

  it('rejects a transaction with no successful flag', async () => {
    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(horizonTx(invoice.memo, { successful: undefined }));

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/verify`, {
      txHash: TX_HASH,
    });

    expect(status).toBe(400);
    expect(body.code).toBe('TX_FAILED');
    await expectStillPending(invoice.id);
  });

  it('checks success before the amount comparison', async () => {
    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(
      horizonTx(invoice.memo, { successful: false, amount: '999.0000000' }),
    );

    const { body } = await call('POST', `/api/invoices/${invoice.id}/verify`, {
      txHash: TX_HASH,
    });

    expect(body.code).toBe('TX_FAILED');
    expect(body.code).not.toBe('AMOUNT_MISMATCH');
  });

  it('rejects a hash Horizon answers 404 for and keeps the invoice pending', async () => {
    const invoice = seedInvoice();
    getTransaction.mockRejectedValue(
      Object.assign(new Error('Transaction not found: Not Found'), { code: 'TX_NOT_FOUND' }),
    );

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/verify`, {
      txHash: TX_HASH,
    });

    expect(status).toBe(404);
    expect(body.code).toBe('TX_NOT_FOUND');
    await expectStillPending(invoice.id);
  });

  it('keeps other Horizon failures as a generic verify failure', async () => {
    const invoice = seedInvoice();
    getTransaction.mockRejectedValue(new Error('Horizon unavailable'));

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/verify`, {
      txHash: TX_HASH,
    });

    expect(status).toBe(500);
    expect(body.code).toBe('VERIFY_FAILED');
    await expectStillPending(invoice.id);
  });

  it('rejects a successful transaction that is not a payment', async () => {
    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(horizonTx(invoice.memo, { opType: 'manage_data' }));

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/verify`, {
      txHash: TX_HASH,
    });

    expect(status).toBe(400);
    expect(body.code).toBe('NO_PAYMENT_OPERATION');
    await expectStillPending(invoice.id);
  });

  it('still marks the invoice paid for a successful matching payment', async () => {
    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(horizonTx(invoice.memo));

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/verify`, {
      txHash: TX_HASH,
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('PAID');
  });
});
