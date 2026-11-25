import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const PAYER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const OTHER = 'GBRPYHIL2C4DBQMTG2K4QXEWSD72OPLZS4UAJWD6JMTHFS2U6PG4IGHA';
const getTransaction = vi.fn();

vi.mock('../src/services/stellar.service', () => ({
  default: { getTransaction: (hash: string) => getTransaction(hash) },
}));

const { default: app } = await import('../src/server-mvp');
const { default: storage } = await import('../src/storage/memory-storage');

let server: Server;
let baseUrl: string;

function seedInvoice(status: 'PENDING' | 'PAID' = 'PAID') {
  const invoice = storage.createInvoice({
    sellerPublicKey: SELLER,
    amount: 12.5,
    assetCode: 'XLM',
    memo: `REFUND-${Date.now()}`,
    expiresAt: new Date(Date.now() + 86_400_000),
  });
  if (status === 'PAID') storage.markAsPaid(invoice.id, 'a'.repeat(64), PAYER, { ledger: 100 });
  return storage.getInvoiceById(invoice.id)!;
}

function refundReceipt(memo: string, destination = PAYER) {
  return {
    transaction: { memo, memo_type: 'text', ledger_sequence: 101, created_at: '2026-11-24T14:00:00.000Z' },
    operations: [{ type: 'payment', from: SELLER, to: destination, amount: '12.5000000', asset_type: 'native' }],
  };
}

async function refund(id: string, hash: string) {
  const response = await fetch(`${baseUrl}/api/invoices/${id}/refund`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sellerPublicKey: SELLER, refundTxHash: hash }),
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

describe('MVP invoice refunds', () => {
  it('records a matching reversal while preserving the original payment hash', async () => {
    const invoice = seedInvoice();
    const refundHash = 'b'.repeat(64);
    getTransaction.mockResolvedValue(refundReceipt(invoice.memo));

    const result = await refund(invoice.id, refundHash);

    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({ status: 'REFUNDED', paymentTxHash: 'a'.repeat(64), refundTxHash: refundHash, refundLedger: 101 });
  });

  it('rejects a wrong destination without changing the invoice', async () => {
    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(refundReceipt(invoice.memo, OTHER));

    const result = await refund(invoice.id, 'c'.repeat(64));

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('REFUND_MISMATCH');
    expect(storage.getInvoiceById(invoice.id)?.status).toBe('PAID');
  });

  it('rejects a pending invoice before contacting Horizon', async () => {
    const invoice = seedInvoice('PENDING');
    const result = await refund(invoice.id, 'd'.repeat(64));

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('INVOICE_NOT_PAID');
    expect(getTransaction).not.toHaveBeenCalled();
  });

  it('rejects a second refund and keeps the first refund hash', async () => {
    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(refundReceipt(invoice.memo));
    expect((await refund(invoice.id, 'e'.repeat(64))).status).toBe(200);

    const second = await refund(invoice.id, 'f'.repeat(64));
    expect(second.body.code).toBe('ALREADY_REFUNDED');
    expect(storage.getInvoiceById(invoice.id)?.refundTxHash).toBe('e'.repeat(64));
    expect(getTransaction).toHaveBeenCalledTimes(1);
  });
});
