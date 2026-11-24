/**
 * mvp-invoice-extend-expiry.test.ts
 *
 * HTTP coverage for the one-time seller expiry extension (issue #1005).
 * Covers the first extension, a second attempt, a shorter date, and a paid
 * invoice. Memo, amount, and asset must stay unchanged.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Server } from 'http';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const OTHER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const PAYER = 'GDRXE2BQUC3SFOPFLAUJWGLSW7LGOFNFRMMIAAYMHFPRG4OD2FUD55RB';

const { default: app } = await import('../src/server-mvp');
const { default: memoryStorage } = await import('../src/storage/memory-storage');

let server: Server;
let baseUrl: string;
let memoCounter = 0;

function nextMemo(prefix: string) {
  memoCounter += 1;
  return `${prefix}-${memoCounter}`;
}

function seedInvoice(overrides: { expiresAt?: Date; status?: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' } = {}) {
  const expiresAt = overrides.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invoice = memoryStorage.createInvoice({
    sellerPublicKey: SELLER,
    amount: 12.5,
    assetCode: 'XLM',
    memo: nextMemo('EXT'),
    expiresAt,
  });

  if (overrides.status && overrides.status !== 'PENDING') {
    return memoryStorage.updateInvoice(invoice.id, { status: overrides.status })!;
  }

  return invoice;
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

describe('MVP invoice expiry extension', () => {
  it('lets the owning seller extend a pending invoice once', async () => {
    const invoice = seedInvoice();
    const originalExpiresAt = invoice.expiresAt.toISOString();
    const newExpiresAt = new Date(invoice.expiresAt.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/extend-expiry`, {
      sellerPublicKey: SELLER,
      expiresAt: newExpiresAt,
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.expiresAt).toBe(newExpiresAt);
    expect(body.data.originalExpiresAt).toBe(originalExpiresAt);
    expect(body.data.expiryExtended).toBe(true);
    expect(body.data.memo).toBe(invoice.memo);
    expect(body.data.amount).toBe(invoice.amount);
    expect(body.data.assetCode).toBe(invoice.assetCode);
    expect(body.data.status).toBe('PENDING');
  });

  it('rejects a second extension attempt', async () => {
    const invoice = seedInvoice();
    const first = new Date(invoice.expiresAt.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const second = new Date(invoice.expiresAt.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();

    const firstRes = await call('POST', `/api/invoices/${invoice.id}/extend-expiry`, {
      sellerPublicKey: SELLER,
      expiresAt: first,
    });
    expect(firstRes.status).toBe(200);

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/extend-expiry`, {
      sellerPublicKey: SELLER,
      expiresAt: second,
    });

    expect(status).toBe(400);
    expect(body.code).toBe('ALREADY_EXTENDED');
    expect(memoryStorage.getInvoiceById(invoice.id)?.expiresAt.toISOString()).toBe(first);
    expect(memoryStorage.getInvoiceById(invoice.id)?.memo).toBe(invoice.memo);
  });

  it('rejects a shorter date', async () => {
    const invoice = seedInvoice();
    const shorter = new Date(invoice.expiresAt.getTime() - 60_000).toISOString();

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/extend-expiry`, {
      sellerPublicKey: SELLER,
      expiresAt: shorter,
    });

    expect(status).toBe(400);
    expect(body.code).toBe('NEW_EXPIRY_NOT_AFTER_OLD');
    expect(memoryStorage.getInvoiceById(invoice.id)?.expiryExtended).toBe(false);
  });

  it('rejects a paid invoice', async () => {
    const invoice = seedInvoice();
    memoryStorage.markAsPaid(invoice.id, 'a'.repeat(64), PAYER, { ledger: 1 });
    const later = new Date(invoice.expiresAt.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/extend-expiry`, {
      sellerPublicKey: SELLER,
      expiresAt: later,
    });

    expect(status).toBe(400);
    expect(body.code).toBe('NOT_EXTENDABLE');
    expect(memoryStorage.getInvoiceById(invoice.id)?.status).toBe('PAID');
  });

  it('revives an expired unpaid invoice without changing memo or amount', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const invoice = seedInvoice({ expiresAt: past, status: 'EXPIRED' });
    const later = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/extend-expiry`, {
      sellerPublicKey: SELLER,
      expiresAt: later,
    });

    expect(status).toBe(200);
    expect(body.data.status).toBe('PENDING');
    expect(body.data.memo).toBe(invoice.memo);
    expect(body.data.amount).toBe(12.5);
  });

  it('does not revive a voided invoice', async () => {
    const invoice = seedInvoice({ status: 'CANCELLED' });
    const later = new Date(invoice.expiresAt.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/extend-expiry`, {
      sellerPublicKey: SELLER,
      expiresAt: later,
    });

    expect(status).toBe(400);
    expect(body.code).toBe('NOT_EXTENDABLE');
    expect(memoryStorage.getInvoiceById(invoice.id)?.status).toBe('CANCELLED');
  });

  it('rejects a non-owner', async () => {
    const invoice = seedInvoice();
    const later = new Date(invoice.expiresAt.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/extend-expiry`, {
      sellerPublicKey: OTHER,
      expiresAt: later,
    });

    expect(status).toBe(400);
    expect(body.code).toBe('NOT_OWNER');
  });
});
