// Smoke tests for the in-memory invoice storage used by the MVP backend.
// Runs via Vitest (`npm test` in the backend).
import { beforeEach, describe, it, expect } from 'vitest';

import memoryStorage from '../src/storage/memory-storage';
import invoiceMemoryService from '../src/services/invoice-memory.service';

// Two well-formed Stellar public keys (length 56, starts with G, base32 alphabet).
// Shape only; values are not used for any cryptographic operation.
const SELLER_A = 'G' + 'A'.repeat(55);
const SELLER_B = 'G' + 'B'.repeat(55);
const SELLER_C = 'G' + 'C'.repeat(55);

// Memo generator + counter reset every test so memos stay globally unique
// without crossing test boundaries.
let memoCounter = 0;
function nextMemo(prefix: string): string {
  memoCounter += 1;
  return `${prefix}-${memoCounter}-${Date.now().toString(36)}`;
}

function buildSeed(overrides: Record<string, unknown> = {}) {
  return {
    sellerPublicKey: SELLER_A,
    amount: 100,
    assetCode: 'XLM',
    memo: nextMemo('seed'),
    ...overrides,
  };
}

describe('memory storage', () => {
beforeEach(() => {
  // MemoryStorage is a process-wide singleton; reset both the data and the
  // memo counter so each test starts from a clean, deterministic state.
  memoryStorage.clear();
  memoCounter = 0;
});

  it('createInvoice assigns defaults (status PENDING, assetCode XLM, expiresAt ~7 days)', () => {
  const seed = buildSeed();
  const invoice = memoryStorage.createInvoice(seed);

  expect(invoice.status).toBe('PENDING');
  expect(invoice.assetCode).toBe('XLM');
  expect(invoice.amount).toBe(100);
  expect(invoice.sellerPublicKey).toBe(SELLER_A);
  expect(invoice.id).toBeTruthy();
  expect(invoice.createdAt instanceof Date).toBeTruthy();
  expect(invoice.expiresAt instanceof Date).toBeTruthy();
  expect(invoice.paymentTxHash).toBe(undefined);
  expect(invoice.payerPublicKey).toBe(undefined);
  expect(invoice.paidAt).toBe(undefined);

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const diff = invoice.expiresAt.getTime() - invoice.createdAt.getTime();
  // 250ms tolerance: tsx cold-start in CI can introduce ms-scale jitter between
  // the two `new Date()` calls inside `createInvoice`. Tight enough to catch a
  // real regression (e.g. accidental `1000 * 60 * 60 * 1000`), loose enough to
  // be stable across CI hosts.
  assert.ok(
    Math.abs(diff - sevenDaysMs) < 250,
    `expiresAt should be 7 days after createdAt (got ${diff}ms)`,
  );

  expect(memoryStorage.size()).toBe(1, 'storage should hold exactly one invoice');
});

  it('createInvoice honors provided id, assetCode, and assetIssuer', () => {
  const customId = 'custom-invoice-id-001';
  const usdcIssuer = 'GBBDNYA45PVTXJUFQOZT2YVQ5WWMZE3DGCHHMDD6V7V2XPGGTS3AHFGW';
  const memo = nextMemo('usdc');

  const invoice = memoryStorage.createInvoice(
    buildSeed({
      id: customId,
      amount: 12.5,
      assetCode: 'USDC',
      assetIssuer: usdcIssuer,
      memo,
    }),
  );

  expect(invoice.id).toBe(customId, 'provided id is preserved verbatim');
  expect(invoice.assetCode).toBe('USDC');
  expect(invoice.assetIssuer).toBe(usdcIssuer);
  expect(invoice.memo).toBe(memo);

  const refetched = memoryStorage.getInvoiceById(customId);
  expect(refetched).toBeTruthy();
  expect(refetched?.memo).toBe(memo);
});

  it('getInvoiceById returns the matching invoice', () => {
  const created = memoryStorage.createInvoice(
    buildSeed({ amount: 42, memo: nextMemo('fetch-hit') }),
  );

  const fetched = memoryStorage.getInvoiceById(created.id);

  expect(fetched).toBeTruthy();
  expect(fetched!.id).toBe(created.id);
  expect(fetched!.sellerPublicKey).toBe(created.sellerPublicKey);
  expect(fetched!.amount).toBe(42);
  expect(fetched!.status).toBe('PENDING');
});

  it('getInvoiceByMemo returns the matching invoice and undefined for an unknown memo', () => {
  const memo = nextMemo('memo-hit');
  const created = memoryStorage.createInvoice(buildSeed({ memo }));

  expect(memoryStorage.getInvoiceByMemo(memo)).toBe(created);
  expect(memoryStorage.getInvoiceByMemo('does-not-exist')).toBe(undefined);
});

  it('getInvoiceById returns undefined for a missing id', () => {
  expect(memoryStorage.getInvoiceById('does-not-exist')).toBe(undefined);
});

  it('createInvoice then getInvoiceByMemo returns same id', () => {
  const memo = nextMemo('memo-lookup');
  const created = memoryStorage.createInvoice(buildSeed({ memo }));

  const fetched = memoryStorage.getInvoiceByMemo(memo);

  expect(fetched).toBeTruthy();
  expect(fetched!.id).toBe(created.id, 'id from memo lookup must match the created invoice id');
});

  it('storage is reset between tests (clear() isolation sanity)', () => {
  // This test deliberately does not create anything; if beforeEach stops
  // clearing the singleton, this will fail loudly instead of polluting other tests.
  expect(memoryStorage.size()).toBe(0, 'storage should be empty at test start');
  expect(memoryStorage.getAllInvoices().length).toBe(0);
  expect(memoryStorage.getInvoiceById('any-id')).toBe(undefined);
});

  it('seller-scoped list returns only invoices for the requested seller', () => {
  // Seller A: 2 invoices
  memoryStorage.createInvoice(buildSeed({ sellerPublicKey: SELLER_A, memo: nextMemo('A') }));
  memoryStorage.createInvoice(buildSeed({ sellerPublicKey: SELLER_A, memo: nextMemo('A'), amount: 200 }));
  // Seller B: 1 invoice
  memoryStorage.createInvoice(buildSeed({ sellerPublicKey: SELLER_B, memo: nextMemo('B'), amount: 300 }));
  // Seller C (sanity): 1 invoice that should never leak into A or B listings
  memoryStorage.createInvoice(buildSeed({ sellerPublicKey: SELLER_C, memo: nextMemo('C'), amount: 400 }));

  const all = memoryStorage.getAllInvoices();
  expect(all.length).toBe(4, 'storage holds all four invoices before seller filter');

  // Mirrors InvoiceMemoryService.getInvoicesBySeller: take everything from storage
  // and filter in-memory by sellerPublicKey.
  const sellerA = all.filter((inv) => inv.sellerPublicKey === SELLER_A);
  const sellerB = all.filter((inv) => inv.sellerPublicKey === SELLER_B);
  const sellerC = all.filter((inv) => inv.sellerPublicKey === SELLER_C);

  expect(sellerA.length).toBe(2, 'seller A has exactly two invoices');
  expect(sellerB.length).toBe(1, 'seller B has exactly one invoice');
  expect(sellerC.length).toBe(1, 'seller C has exactly one invoice');

  expect(sellerA.every((inv) => inv.sellerPublicKey === SELLER_A)).toBeTruthy();
  expect(sellerB.every((inv) => inv.sellerPublicKey === SELLER_B)).toBeTruthy();
  assert.equal(
    sellerA.find((inv) => inv.sellerPublicKey === SELLER_B),
    undefined,
    'no cross-leak between seller A and seller B',
  );
});

  it('InvoiceMemoryService.getInvoicesBySeller scopes by seller through storage', async () => {
  // Integration-style check: exercise the same path the application uses, not
  // a hand-rolled filter mirror.
  memoryStorage.createInvoice(buildSeed({ sellerPublicKey: SELLER_A, memo: nextMemo('svc-A'), amount: 11 }));
  memoryStorage.createInvoice(buildSeed({ sellerPublicKey: SELLER_A, memo: nextMemo('svc-A'), amount: 22 }));
  memoryStorage.createInvoice(buildSeed({ sellerPublicKey: SELLER_B, memo: nextMemo('svc-B'), amount: 33 }));

  const sellerAList = await invoiceMemoryService.getInvoicesBySeller(SELLER_A);
  const sellerBList = await invoiceMemoryService.getInvoicesBySeller(SELLER_B);

  expect(sellerAList.length).toBe(2, 'service returns two invoices for seller A');
  expect(sellerBList.length).toBe(1, 'service returns exactly one invoice for seller B');
  expect(sellerAList.every((inv) => inv.sellerPublicKey === SELLER_A)).toBeTruthy();
});

  it('#469 seller-scoped invoice list returns only that seller rows (two distinct sellers)', () => {
  // Two distinct seller public keys.
  const sellerAInvoices = [
    memoryStorage.createInvoice(buildSeed({ sellerPublicKey: SELLER_A, memo: nextMemo('469-A'), amount: 10 })),
    memoryStorage.createInvoice(buildSeed({ sellerPublicKey: SELLER_A, memo: nextMemo('469-A'), amount: 20 })),
  ];
  const sellerBInvoices = [
    memoryStorage.createInvoice(buildSeed({ sellerPublicKey: SELLER_B, memo: nextMemo('469-B'), amount: 30 })),
  ];

  const all = memoryStorage.getAllInvoices();
  expect(all.length).toBe(3, 'storage holds all three invoices before seller filter');

  // Filter by sellerPublicKey exactly as the service does.
  const sellerAList = all.filter((inv) => inv.sellerPublicKey === SELLER_A);
  const sellerBList = all.filter((inv) => inv.sellerPublicKey === SELLER_B);

  expect(sellerAList.length).toBe(2, 'seller A list contains only seller A rows');
  expect(sellerBList.length).toBe(1, 'seller B list contains only seller B rows');

  expect(sellerAList.map((inv) => inv.id).sort()).toEqual(sellerAInvoices.map((inv) => inv.id).sort());
  expect(sellerBList.every((inv) => inv.sellerPublicKey === SELLER_B)).toBeTruthy();
  assert.equal(
    sellerAList.find((inv) => inv.sellerPublicKey === SELLER_B),
    undefined,
    'no cross-leak between seller A and seller B listings',
  );
});
  it('markExpiredInvoices transitions past-dated PENDING invoices to EXPIRED', () => {
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  // PENDING invoice with expiresAt in the past — should be marked EXPIRED
  const expiredCandidate = memoryStorage.createInvoice(
    buildSeed({ memo: nextMemo('expire'), expiresAt: pastDate }),
  );
  expect(expiredCandidate.status).toBe('PENDING', 'starts as PENDING');

  // PENDING invoice with expiresAt in the future — should remain PENDING
  const futureInvoice = memoryStorage.createInvoice(
    buildSeed({ memo: nextMemo('future'), expiresAt: futureDate }),
  );
  expect(futureInvoice.status).toBe('PENDING', 'future invoice starts as PENDING');

  // PAID invoice — should be untouched
  const paidInvoice = memoryStorage.createInvoice(
    buildSeed({ memo: nextMemo('paid') }),
  );
  memoryStorage.markAsPaid(paidInvoice.id, 'tx-hash-001', 'G' + 'P'.repeat(55));
  const paidFetched = memoryStorage.getInvoiceById(paidInvoice.id);
  expect(paidFetched?.status).toBe('PAID', 'starts as PAID');

  const count = memoryStorage.markExpiredInvoices();
  expect(count).toBe(1, 'exactly one invoice should be expired');

  // Past-dated PENDING → EXPIRED
  const refreshedExpired = memoryStorage.getInvoiceById(expiredCandidate.id);
  expect(refreshedExpired?.status).toBe('EXPIRED', 'past-dated PENDING invoice becomes EXPIRED');

  // Future PENDING → unchanged
  const refreshedFuture = memoryStorage.getInvoiceById(futureInvoice.id);
  expect(refreshedFuture?.status).toBe('PENDING', 'future PENDING invoice stays PENDING');

  // PAID → untouched
  const refreshedPaid = memoryStorage.getInvoiceById(paidInvoice.id);
  expect(refreshedPaid?.status).toBe('PAID', 'PAID invoice is untouched');
});

