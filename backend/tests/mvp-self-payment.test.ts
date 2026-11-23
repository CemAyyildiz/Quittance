/**
 * mvp-self-payment.test.ts
 *
 * The MVP verify endpoint is driven over HTTP (ephemeral port, Horizon mocked)
 * to prove a seller cannot settle their own invoice:
 *
 * - a plain payment from the seller is rejected,
 * - a fee-bump whose inner source is the seller is still a self-payment,
 * - a normal client payer is accepted.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Server } from 'http';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const PAYER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const TX_HASH = 'b'.repeat(64);

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
    memo: `SELF-${memoCounter}`,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}

/**
 * A Horizon receipt. `source_account` is the transaction source (for a
 * fee-bump Horizon reports the inner transaction's source).
 */
function horizonTx(
  memo: string,
  options: {
    txSource?: string;
    feeAccount?: string;
    opSource?: string;
  } = {},
) {
  const { txSource, feeAccount, opSource } = options;

  return {
    transaction: {
      memo,
      ledger_sequence: 12345,
      created_at: new Date().toISOString(),
      ...(txSource ? { source_account: txSource } : {}),
      ...(feeAccount ? { fee_account: feeAccount } : {}),
    },
    operations: [
      {
        type: 'payment',
        to: SELLER,
        from: opSource ?? PAYER,
        ...(opSource ? { source_account: opSource } : {}),
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

describe('MVP self-payment rejection', () => {
  it('rejects a payment whose source is the seller and leaves the invoice pending', async () => {
    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(horizonTx(invoice.memo, { txSource: SELLER }));

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/verify`, {
      txHash: TX_HASH,
    });

    expect(status).toBe(400);
    expect(body.code).toBe('SELF_PAYMENT');
    expect(body.error).toBe('The invoice seller cannot settle their own invoice.');

    const after = await call('GET', `/api/invoices/${invoice.id}`);
    expect(after.body.data.status).toBe('PENDING');
  });

  it('rejects a fee-bump whose inner source is the seller', async () => {
    const invoice = seedInvoice();
    // The payer account paid the fee, but the inner transaction (and therefore
    // the payment) is the seller's.
    getTransaction.mockResolvedValue(
      horizonTx(invoice.memo, { txSource: SELLER, feeAccount: PAYER }),
    );

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/verify`, {
      txHash: TX_HASH,
    });

    expect(status).toBe(400);
    expect(body.code).toBe('SELF_PAYMENT');

    const after = await call('GET', `/api/invoices/${invoice.id}`);
    expect(after.body.data.status).toBe('PENDING');
  });

  it('rejects a payment operation sourced from the seller', async () => {
    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(
      horizonTx(invoice.memo, { txSource: PAYER, opSource: SELLER }),
    );

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/verify`, {
      txHash: TX_HASH,
    });

    expect(status).toBe(400);
    expect(body.code).toBe('SELF_PAYMENT');
  });

  it('rejects a verify request that reports a mismatched network', async () => {
    const invoice = seedInvoice();

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/verify`, {
      txHash: TX_HASH,
      network: 'PUBLIC',
    });

    expect(status).toBe(400);
    expect(body.code).toBe('NETWORK_MISMATCH');
    expect(getTransaction).not.toHaveBeenCalled();

    const after = await call('GET', `/api/invoices/${invoice.id}`);
    expect(after.body.data.status).toBe('PENDING');
  });

  it('accepts a different payer whose memo and fields match', async () => {
    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(horizonTx(invoice.memo, { txSource: PAYER }));

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/verify`, {
      txHash: TX_HASH,
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('PAID');
  });
});
