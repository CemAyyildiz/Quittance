import { describe, expect, it, vi } from 'vitest';
import { runMvpPaymentMonitorPass } from '../mvp-payment-monitor';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const PAYER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

function createHarness(invoices: any[]) {
  const map = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const txHashes = new Set<string>();
  const store = {
    markExpiredInvoices: vi.fn(() => 0),
    getPendingInvoices: vi.fn(() => Array.from(map.values()).filter((invoice) => invoice.status === 'PENDING')),
    getInvoiceByTxHash: vi.fn(async (txHash: string) => {
      for (const invoice of map.values()) {
        if (invoice.paymentTxHash === txHash) return invoice;
      }
      return null;
    }),
    markAsPaid: vi.fn(async (id: string, txHash: string, payer: string, ledger: number, paidAt?: Date) => {
      const invoice = map.get(id);
      if (!invoice || invoice.status === 'PAID') return invoice;
      if (txHashes.has(txHash)) return invoice;
      txHashes.add(txHash);
      const updated = { ...invoice, status: 'PAID', paymentTxHash: txHash, payerPublicKey: payer, ledger, paidAt };
      map.set(id, updated);
      return updated;
    }),
  };
  return { map, store };
}

function invoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'invoice-1',
    sellerPublicKey: SELLER,
    amount: 1.5,
    assetCode: 'XLM',
    memo: 'INV-1',
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  };
}

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'op-1',
    txHash: 'a'.repeat(64),
    from: PAYER,
    to: SELLER,
    amount: '1.5000000',
    assetCode: 'XLM',
    memo: 'INV-1',
    memoType: 'text',
    ledger: 123,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('MVP payment monitor', () => {
  it('marks a matching payment paid', async () => {
    const { map, store } = createHarness([invoice()]);
    const feed = { getRecentPayments: vi.fn(async () => [payment()]) };
    await runMvpPaymentMonitorPass(store, feed);
    expect(map.get('invoice-1')?.status).toBe('PAID');
    expect(store.markAsPaid).toHaveBeenCalledWith('invoice-1', 'a'.repeat(64), PAYER, 123, expect.any(Date));
  });

  it('ignores a mismatch', async () => {
    const { map, store } = createHarness([invoice()]);
    const feed = { getRecentPayments: vi.fn(async () => [payment({ amount: '2.0000000' })]) };
    await runMvpPaymentMonitorPass(store, feed);
    expect(map.get('invoice-1')?.status).toBe('PENDING');
  });

  it('keeps the first of two matching payments', async () => {
    const { map, store } = createHarness([invoice()]);
    const feed = { getRecentPayments: vi.fn(async () => [
      payment({ txHash: 'b'.repeat(64), ledger: 124 }),
      payment({ txHash: 'c'.repeat(64), ledger: 125 }),
    ]) };
    await runMvpPaymentMonitorPass(store, feed);
    expect(map.get('invoice-1')?.paymentTxHash).toBe('b'.repeat(64));
  });

  it('does not settle an expired invoice', async () => {
    const expired = invoice({ expiresAt: new Date(Date.now() - 60_000) });
    const { map, store } = createHarness([expired]);
    const feed = { getRecentPayments: vi.fn(async () => [payment()]) };
    await runMvpPaymentMonitorPass(store, feed);
    expect(map.get('invoice-1')?.status).toBe('PENDING');
  });

  it('leaves the invoice pending for a hash memo and marks it paid for the exact text memo', async () => {
    const hashed = createHarness([invoice()]);
    await runMvpPaymentMonitorPass(hashed.store, {
      getRecentPayments: vi.fn(async () => [payment({ memoType: 'hash' })]),
    });
    expect(hashed.map.get('invoice-1')?.status).toBe('PENDING');

    const text = createHarness([invoice()]);
    await runMvpPaymentMonitorPass(text.store, {
      getRecentPayments: vi.fn(async () => [payment({ memoType: 'text' })]),
    });
    expect(text.map.get('invoice-1')?.status).toBe('PAID');
  });

  it.each([
    ['an id memo', { memoType: 'id', memo: 'INV-1' }],
    ['a missing memo', { memoType: 'none', memo: undefined }],
    ['a record without a memo type', { memoType: undefined }],
    ['a text memo in another case', { memo: 'inv-1' }],
    ['a text memo with surrounding spaces', { memo: ' INV-1 ' }],
  ])('leaves the invoice pending for %s', async (_label, overrides) => {
    const { map, store } = createHarness([invoice()]);
    await runMvpPaymentMonitorPass(store, {
      getRecentPayments: vi.fn(async () => [payment(overrides)]),
    });
    expect(map.get('invoice-1')?.status).toBe('PENDING');
  });

  it('leaves pending when Horizon fails', async () => {
    const { map, store } = createHarness([invoice()]);
    const feed = { getRecentPayments: vi.fn(async () => { throw new Error('offline'); }) };
    await runMvpPaymentMonitorPass(store, feed);
    expect(map.get('invoice-1')?.status).toBe('PENDING');
  });
});
