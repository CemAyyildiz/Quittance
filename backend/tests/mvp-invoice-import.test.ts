import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const OTHER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const { default: app } = await import('../src/server-mvp');
const { default: storage } = await import('../src/storage/memory-storage');

const invoice = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  sellerPublicKey: SELLER,
  amount: 12.5,
  assetCode: 'XLM',
  memo: `BACKUP-${id}`,
  status: 'PAID',
  paymentTxHash: id.padEnd(64, 'a'),
  payerPublicKey: OTHER,
  ledger: 100,
  createdAt: '2026-11-20T10:00:00.000Z',
  paidAt: '2026-11-20T11:00:00.000Z',
  expiresAt: '2026-11-27T10:00:00.000Z',
  originalExpiresAt: '2026-11-27T10:00:00.000Z',
  expiryExtended: false,
  ...overrides,
});

const importRows = (rows: unknown) => request(app)
  .post('/api/invoices/import')
  .query({ sellerPublicKey: SELLER })
  .send(rows);

beforeEach(() => storage.clear());

describe('POST /api/invoices/import', () => {
  it('restores invoice fields and lookup indexes', async () => {
    const response = await importRows([invoice('one', { assetCode: 'USDC', assetIssuer: OTHER })]);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ imported: 1, skippedIds: [] });
    const restored = storage.getInvoiceById('one')!;
    expect(restored).toMatchObject({
      status: 'PAID', memo: 'BACKUP-one', amount: 12.5,
      assetCode: 'USDC', assetIssuer: OTHER, paymentTxHash: 'one'.padEnd(64, 'a'),
    });
    expect(restored.createdAt.toISOString()).toBe('2026-11-20T10:00:00.000Z');
    expect(storage.getInvoiceByMemo('BACKUP-one')?.id).toBe('one');
    expect(storage.getInvoiceByTxHash('one'.padEnd(64, 'a'))?.id).toBe('one');
  });

  it('rejects the entire backup when a row belongs to another seller', async () => {
    const response = await importRows([invoice('own'), invoice('foreign', { sellerPublicKey: OTHER })]);
    expect(response.status).toBe(400);
    expect(storage.size()).toBe(0);
  });

  it('rejects invalid rows and malformed JSON without writing', async () => {
    expect((await importRows([invoice('valid'), { id: 'bad' }])).status).toBe(400);
    const malformed = await request(app)
      .post('/api/invoices/import')
      .query({ sellerPublicKey: SELLER })
      .set('Content-Type', 'application/json')
      .send('[{"broken":');
    expect(malformed.status).toBe(400);
    expect(storage.size()).toBe(0);
  });

  it('skips existing IDs and reports them without replacing their fields', async () => {
    storage.createInvoice({ id: 'existing', sellerPublicKey: OTHER, amount: 1, memo: 'ORIGINAL' });
    const response = await importRows([invoice('new'), invoice('existing')]);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ imported: 1, skippedIds: ['existing'] });
    expect(storage.getInvoiceById('existing')?.sellerPublicKey).toBe(OTHER);
    expect(storage.getInvoiceById('existing')?.memo).toBe('ORIGINAL');
  });

  it('rejects an open memo collision without partially inserting rows', async () => {
    storage.createInvoice({ id: 'existing', sellerPublicKey: SELLER, amount: 1, memo: 'TAKEN' });
    const response = await importRows([invoice('new'), invoice('collision', { memo: 'TAKEN' })]);
    expect(response.status).toBe(400);
    expect(storage.size()).toBe(1);
    expect(storage.getInvoiceById('new')).toBeUndefined();
  });
});
