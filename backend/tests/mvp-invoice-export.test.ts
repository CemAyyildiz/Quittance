import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/server-mvp';
import storage from '../src/storage/memory-storage';
import { createInvoiceBackup } from '../src/utils/invoice-backup';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const OTHER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
beforeEach(() => storage.clear());

function seed(id: string, sellerPublicKey = SELLER) {
  return storage.createInvoice({ id, sellerPublicKey, memo: `MEMO-${id}`, amount: 1.25, assetCode: 'XLM', customerEmail: 'private@example.com' });
}
function backup(query: Record<string, string> = {}) {
  return request(app).get('/api/invoices/export').query({ sellerPublicKey: SELLER, ...query });
}

describe('invoice JSON backup export', () => {
  it('downloads a JSON array of all seller records, beyond one dashboard page', async () => {
    for (let n = 0; n < 61; n++) seed(`own-${n}`);
    seed('foreign', OTHER);
    const response = await backup();
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.headers['content-disposition']).toContain('.json');
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body).toHaveLength(61);
    expect(response.body.every((row: any) => row.sellerPublicKey === SELLER)).toBe(true);
    expect(response.body.some((row: any) => row.id === 'foreign')).toBe(false);
  });

  it('omits customer email unless the request explicitly opts in', async () => {
    seed('own');
    expect((await backup()).body[0]).not.toHaveProperty('customerEmail');
    expect((await backup({ includeCustomerEmail: 'false' })).body[0]).not.toHaveProperty('customerEmail');
    expect((await backup({ includeCustomerEmail: 'true' })).body[0].customerEmail).toBe('private@example.com');
    expect(storage.getInvoiceById('own')?.customerEmail).toBe('private@example.com');
  });

  it('preserves payment identity, amounts, assets, statuses, hashes and dates for import', async () => {
    seed('paid');
    storage.markAsPaid('paid', 'a'.repeat(64), OTHER, { ledger: 123, paidAt: new Date('2026-11-20T00:00:00Z') });
    const original = storage.getInvoiceById('paid')!;
    const response = await backup();
    const row = JSON.parse(JSON.stringify(response.body))[0];
    expect(row).toMatchObject({ id: 'paid', memo: 'MEMO-paid', amount: 1.25, assetCode: 'XLM', sellerPublicKey: SELLER, status: 'PAID', paymentTxHash: 'a'.repeat(64), payerPublicKey: OTHER, ledger: 123 });
    expect(new Date(row.createdAt)).toEqual(original.createdAt);
    expect(new Date(row.paidAt)).toEqual(original.paidAt);
    expect(row).not.toHaveProperty('proofDigest');
  });

  it('includes line items without mutating the stored invoice', () => {
    const invoice = { ...seed('lines'), lineItems: [{ description: 'Design', quantity: 2, unitPrice: 0.625 }] };
    const [row] = createInvoiceBackup([invoice], SELLER);
    expect(row.lineItems).toEqual(invoice.lineItems);
    expect(row.lineItems).not.toBe(invoice.lineItems);
  });

  it('returns an empty array for a seller with no invoices', async () => {
    expect((await backup()).body).toEqual([]);
  });

  it('rejects invalid keys, ambiguous query values and non-boolean consent', async () => {
    expect((await request(app).get('/api/invoices/export')).status).toBe(400);
    expect((await backup({ sellerPublicKey: 'not-a-key' })).status).toBe(400);
    expect((await backup({ includeCustomerEmail: 'yes' })).status).toBe(400);
    expect((await request(app).get('/api/invoices/export').query({ sellerPublicKey: [SELLER, OTHER] })).status).toBe(400);
  });
});
