/**
 * mvp-verify-hash-format.test.ts
 *
 * Manual-payment verification (issue #998) must reject a short or non-hex
 * transaction hash before Horizon is contacted, and an expired invoice must
 * not spend a Horizon round trip either.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Server } from 'http';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const PAYER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const VALID_TX_HASH = 'a'.repeat(64);

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

function seedInvoice(expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
  memoCounter += 1;
  return memoryStorage.createInvoice({
    sellerPublicKey: SELLER,
    amount: 1.5,
    assetCode: 'XLM',
    memo: `HASH-${memoCounter}`,
    expiresAt,
  });
}

function matchingHorizonTx(memo: string) {
  return {
    transaction: { memo, memo_type: 'text', source_account: PAYER },
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

async function verify(invoiceId: string, txHash: string) {
  const response = await fetch(`${baseUrl}/api/invoices/${invoiceId}/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ txHash }),
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

describe('MVP pasted transaction hash validation', () => {
  it('rejects a short hash before contacting Horizon', async () => {
    const invoice = seedInvoice();

    const { status, body } = await verify(invoice.id, 'a'.repeat(63));

    expect(status).toBe(400);
    expect(body.code).toBe('INVALID_TX_HASH');
    expect(getTransaction).not.toHaveBeenCalled();

    const after = await fetch(`${baseUrl}/api/invoices/${invoice.id}`);
    expect((await after.json() as any).data.status).toBe('PENDING');
  });

  it('rejects a non-hex hash before contacting Horizon', async () => {
    const invoice = seedInvoice();

    const { status, body } = await verify(invoice.id, 'z'.repeat(64));

    expect(status).toBe(400);
    expect(body.code).toBe('INVALID_TX_HASH');
    expect(getTransaction).not.toHaveBeenCalled();
  });

  it('rejects an expired invoice before contacting Horizon even with a valid hash', async () => {
    const invoice = seedInvoice(new Date(Date.now() - 24 * 60 * 60 * 1000));
    getTransaction.mockResolvedValue(matchingHorizonTx(invoice.memo));

    const { status, body } = await verify(invoice.id, VALID_TX_HASH);

    expect(status).toBe(400);
    expect(body.code).toBe('INVOICE_EXPIRED');
    expect(getTransaction).not.toHaveBeenCalled();
  });
});
