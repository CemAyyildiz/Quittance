import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/server-mvp';
import storage from '../src/storage/memory-storage';

const { getTransaction } = vi.hoisted(() => ({ getTransaction: vi.fn() }));
vi.mock('../src/services/stellar.service', () => ({ default: { getTransaction } }));

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const PAYER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
});

async function create(sellerName?: string) {
  return request(app).post('/api/invoices').send({
    amount: 1.5, sellerPublicKey: SELLER, sellerName,
  });
}

describe('invoice seller labels', () => {
  it('stores and returns the trimmed label on creation and subsequent reads', async () => {
    const response = await create('  Studio & Co  ');
    expect(response.status).toBe(201);
    const invoice = response.body.data.invoice;
    expect(invoice.sellerName).toBe('Studio & Co');
    expect(invoice.sellerPublicKey).toBe(SELLER);
    expect(storage.getInvoiceById(invoice.id)?.sellerName).toBe('Studio & Co');
    const read = await request(app).get(`/api/invoices/${invoice.id}`);
    expect(read.body.data.sellerName).toBe('Studio & Co');
  });

  it.each([undefined, '', '   '])('omits an absent or blank label (%s)', async (name) => {
    const response = await create(name);
    expect(response.status).toBe(201);
    expect(response.body.data.invoice).not.toHaveProperty('sellerName');
    expect(response.body.data.invoice.sellerPublicKey).toBe(SELLER);
  });

  it('accepts 80 characters and rejects 81 before storing an invoice', async () => {
    expect((await create('a'.repeat(80))).status).toBe(201);
    expect((await create('a'.repeat(81))).status).toBe(400);
    expect(storage.size()).toBe(1);
  });

  it('requires payment to the public key even when a label looks like another key', async () => {
    const created = await create(PAYER);
    const invoice = created.body.data.invoice;
    getTransaction.mockResolvedValue({
      transaction: {
        memo: invoice.memo,
        memo_type: 'text',
        ledger_sequence: 123,
        source_account: PAYER,
        successful: true,
        created_at: new Date().toISOString(),
        valid_before: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      },
      operations: [{ type: 'payment', from: PAYER, to: PAYER, amount: '1.5', asset_type: 'native' }],
    });
    const wrong = await request(app).post(`/api/invoices/${invoice.id}/verify`).send({ txHash: 'a'.repeat(64) });
    expect(wrong.status).toBe(400);
    expect(wrong.body.code).toBe('DESTINATION_MISMATCH');
    getTransaction.mockResolvedValue({
      transaction: {
        memo: invoice.memo,
        memo_type: 'text',
        ledger_sequence: 123,
        source_account: PAYER,
        successful: true,
        created_at: new Date().toISOString(),
        valid_before: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      },
      operations: [{ type: 'payment', from: PAYER, to: SELLER, amount: '1.5', asset_type: 'native' }],
    });
    const paid = await request(app).post(`/api/invoices/${invoice.id}/verify`).send({ txHash: 'b'.repeat(64) });
    expect(paid.status).toBe(200);
    expect(paid.body.data.sellerPublicKey).toBe(SELLER);
    expect(paid.body.data.sellerName).toBe(PAYER);
  });
});
