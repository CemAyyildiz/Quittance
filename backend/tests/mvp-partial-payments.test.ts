import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const PAYER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const getTransaction = vi.fn();

vi.mock('../src/services/stellar.service', () => ({
  default: { getTransaction: (hash: string) => getTransaction(hash) },
}));

const { default: app } = await import('../src/server-mvp');
const { default: storage } = await import('../src/storage/memory-storage');

let server: Server;
let baseUrl: string;

function seedInvoice() {
  return storage.createInvoice({
    sellerPublicKey: SELLER,
    amount: 10,
    assetCode: 'XLM',
    memo: `PART-${Date.now()}`,
    expiresAt: new Date(Date.now() + 86_400_000),
  });
}

function receipt(memo: string, amount: string) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return {
    transaction: {
      successful: true,
      memo,
      ledger_sequence: 123,
      source_account: PAYER,
      created_at: new Date().toISOString(),
      preconditions: { timebounds: { max_time: String(nowSeconds + 3600) } },
    },
    operations: [{
      type: 'payment',
      to: SELLER,
      from: PAYER,
      amount,
      asset_type: 'native',
    }],
  };
}

async function verify(invoiceId: string, txHash: string) {
  const response = await fetch(`${baseUrl}/api/invoices/${invoiceId}/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ txHash }),
  });
  return { status: response.status, body: await response.json() as any };
}

beforeEach(async () => {
  storage.clear();
  getTransaction.mockReset();
  await new Promise<void>((resolve) => { server = app.listen(0, resolve); });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('MVP partial payments', () => {
  it('records underpayments and closes only when the exact total arrives', async () => {
    const invoice = seedInvoice();
    const firstHash = '1'.repeat(64);
    const secondHash = '2'.repeat(64);
    getTransaction
      .mockResolvedValueOnce(receipt(invoice.memo, '4.25'))
      .mockResolvedValueOnce(receipt(invoice.memo, '5.75'));

    const first = await verify(invoice.id, firstHash);
    expect(first.status).toBe(200);
    expect(first.body.data).toMatchObject({
      status: 'PENDING',
      receivedAmount: '4.25',
      remainingAmount: '5.75',
    });
    expect(first.body.data.payments).toHaveLength(1);
    expect(first.body.data.payments[0]).toMatchObject({ txHash: firstHash, amount: '4.25' });

    const second = await verify(invoice.id, secondHash);
    expect(second.status).toBe(200);
    expect(second.body.data).toMatchObject({
      status: 'PAID',
      receivedAmount: '10',
      remainingAmount: '0',
    });
    expect(second.body.data.payments).toHaveLength(2);
  });

  it('still marks an exact single payment paid', async () => {
    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(receipt(invoice.memo, '10.0000000'));

    const result = await verify(invoice.id, '3'.repeat(64));

    expect(result.status).toBe(200);
    expect(result.body.data.status).toBe('PAID');
    expect(result.body.data.payments).toHaveLength(1);
  });

  it('rejects an overpayment without storing its hash', async () => {
    const invoice = seedInvoice();
    const hash = '4'.repeat(64);
    getTransaction.mockResolvedValue(receipt(invoice.memo, '10.0000001'));

    const result = await verify(invoice.id, hash);

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('AMOUNT_MISMATCH');
    expect(storage.getInvoiceById(invoice.id)?.payments).toHaveLength(0);
    expect(storage.getInvoiceByTxHash(hash)).toBeUndefined();
  });

  it('rejects the same partial-payment hash twice', async () => {
    const invoice = seedInvoice();
    const hash = '5'.repeat(64);
    getTransaction.mockResolvedValue(receipt(invoice.memo, '2'));

    expect((await verify(invoice.id, hash)).status).toBe(200);
    const repeated = await verify(invoice.id, hash);

    expect(repeated.status).toBe(400);
    expect(repeated.body.code).toBe('TX_HASH_ALREADY_USED');
    expect(storage.getInvoiceById(invoice.id)?.payments).toHaveLength(1);
    expect(getTransaction).toHaveBeenCalledTimes(1);
  });
});
