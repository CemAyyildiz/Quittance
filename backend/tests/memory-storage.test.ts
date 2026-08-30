// Smoke tests for the in-memory invoice storage used by the MVP backend.
// Run with: `npx tsx --test tests/memory-storage.test.ts` (Node 18+ required).
import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

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

beforeEach(() => {
  // MemoryStorage is a process-wide singleton; reset both the data and the
  // memo counter so each test starts from a clean, deterministic state.
  memoryStorage.clear();
  memoCounter = 0;
});

test('createInvoice assigns defaults (status PENDING, assetCode XLM, expiresAt ~7 days)', () => {
  const seed = buildSeed();
  const invoice = memoryStorage.createInvoice(seed);

  assert.equal(invoice.status, 'PENDING');
  assert.equal(invoice.assetCode, 'XLM');
  assert.equal(invoice.amount, 100);
  assert.equal(invoice.sellerPublicKey, SELLER_A);
  assert.ok(invoice.id, 'an id should be generated when none is supplied');
  assert.ok(invoice.createdAt instanceof Date, 'createdAt is a Date');
  assert.ok(invoice.expiresAt instanceof Date, 'expiresAt is a Date');
  assert.equal(invoice.paymentTxHash, undefined);
  assert.equal(invoice.payerPublicKey, undefined);
  assert.equal(invoice.paidAt, undefined);

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

  assert.equal(memoryStorage.size(), 1, 'storage should hold exactly one invoice');
});

test('createInvoice honors provided id, assetCode, and assetIssuer', () => {
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

  assert.equal(invoice.id, customId, 'provided id is preserved verbatim');
  assert.equal(invoice.assetCode, 'USDC');
  assert.equal(invoice.assetIssuer, usdcIssuer);
  assert.equal(invoice.memo, memo);

  const refetched = memoryStorage.getInvoiceById(customId);
  assert.ok(refetched, 'id is retrievable through getInvoiceById');
  assert.equal(refetched?.memo, memo);
});

test('getInvoiceById returns the matching invoice', () => {
  const created = memoryStorage.createInvoice(
    buildSeed({ amount: 42, memo: nextMemo('fetch-hit') }),
  );

  const fetched = memoryStorage.getInvoiceById(created.id);

  assert.ok(fetched, 'fetched invoice should be defined');
  assert.equal(fetched!.id, created.id);
  assert.equal(fetched!.sellerPublicKey, created.sellerPublicKey);
  assert.equal(fetched!.amount, 42);
  assert.equal(fetched!.status, 'PENDING');
});

test('getInvoiceByMemo returns the matching invoice and undefined for an unknown memo', () => {
  const memo = nextMemo('memo-hit');
  const created = memoryStorage.createInvoice(buildSeed({ memo }));

  assert.equal(memoryStorage.getInvoiceByMemo(memo), created);
  assert.equal(memoryStorage.getInvoiceByMemo('does-not-exist'), undefined);
});

test('getInvoiceById returns undefined for a missing id', () => {
  assert.equal(memoryStorage.getInvoiceById('does-not-exist'), undefined);
});

test('createInvoice then getInvoiceByMemo returns same id', () => {
  const memo = nextMemo('memo-lookup');
  const created = memoryStorage.createInvoice(buildSeed({ memo }));

  const fetched = memoryStorage.getInvoiceByMemo(memo);

  assert.ok(fetched, 'invoice should be found by memo');
  assert.equal(fetched!.id, created.id, 'id from memo lookup must match the created invoice id');
});

test('storage is reset between tests (clear() isolation sanity)', () => {
  // This test deliberately does not create anything; if beforeEach stops
  // clearing the singleton, this will fail loudly instead of polluting other tests.
  assert.equal(memoryStorage.size(), 0, 'storage should be empty at test start');
  assert.equal(memoryStorage.getAllInvoices().length, 0);
  assert.equal(memoryStorage.getInvoiceById('any-id'), undefined);
});

test('seller-scoped list returns only invoices for the requested seller', () => {
  // Seller A: 2 invoices
  memoryStorage.createInvoice(buildSeed({ sellerPublicKey: SELLER_A, memo: nextMemo('A') }));
  memoryStorage.createInvoice(buildSeed({ sellerPublicKey: SELLER_A, memo: nextMemo('A'), amount: 200 }));
  // Seller B: 1 invoice
  memoryStorage.createInvoice(buildSeed({ sellerPublicKey: SELLER_B, memo: nextMemo('B'), amount: 300 }));
  // Seller C (sanity): 1 invoice that should never leak into A or B listings
  memoryStorage.createInvoice(buildSeed({ sellerPublicKey: SELLER_C, memo: nextMemo('C'), amount: 400 }));

  const all = memoryStorage.getAllInvoices();
  assert.equal(all.length, 4, 'storage holds all four invoices before seller filter');

  // Mirrors InvoiceMemoryService.getInvoicesBySeller: take everything from storage
  // and filter in-memory by sellerPublicKey.
  const sellerA = all.filter((inv) => inv.sellerPublicKey === SELLER_A);
  const sellerB = all.filter((inv) => inv.sellerPublicKey === SELLER_B);
  const sellerC = all.filter((inv) => inv.sellerPublicKey === SELLER_C);

  assert.equal(sellerA.length, 2, 'seller A has exactly two invoices');
  assert.equal(sellerB.length, 1, 'seller B has exactly one invoice');
  assert.equal(sellerC.length, 1, 'seller C has exactly one invoice');

  assert.ok(
    sellerA.every((inv) => inv.sellerPublicKey === SELLER_A),
    'every entry in seller A list belongs to seller A',
  );
  assert.ok(
    sellerB.every((inv) => inv.sellerPublicKey === SELLER_B),
    'every entry in seller B list belongs to seller B',
  );
  assert.equal(
    sellerA.find((inv) => inv.sellerPublicKey === SELLER_B),
    undefined,
    'no cross-leak between seller A and seller B',
  );
});

test('InvoiceMemoryService.getInvoicesBySeller scopes by seller through storage', async () => {
  // Integration-style check: exercise the same path the application uses, not
  // a hand-rolled filter mirror.
  memoryStorage.createInvoice(buildSeed({ sellerPublicKey: SELLER_A, memo: nextMemo('svc-A'), amount: 11 }));
  memoryStorage.createInvoice(buildSeed({ sellerPublicKey: SELLER_A, memo: nextMemo('svc-A'), amount: 22 }));
  memoryStorage.createInvoice(buildSeed({ sellerPublicKey: SELLER_B, memo: nextMemo('svc-B'), amount: 33 }));

  const sellerAList = await invoiceMemoryService.getInvoicesBySeller(SELLER_A);
  const sellerBList = await invoiceMemoryService.getInvoicesBySeller(SELLER_B);

  assert.equal(sellerAList.length, 2, 'service returns two invoices for seller A');
  assert.equal(sellerBList.length, 1, 'service returns exactly one invoice for seller B');
  assert.ok(
    sellerAList.every((inv) => inv.sellerPublicKey === SELLER_A),
    'service-level seller A list is scoped to seller A only',
  );
});

test('#469 seller-scoped invoice list returns only that seller rows (two distinct sellers)', () => {
  // Two distinct seller public keys.
  const sellerAInvoices = [
    memoryStorage.createInvoice(buildSeed({ sellerPublicKey: SELLER_A, memo: nextMemo('469-A'), amount: 10 })),
    memoryStorage.createInvoice(buildSeed({ sellerPublicKey: SELLER_A, memo: nextMemo('469-A'), amount: 20 })),
  ];
  const sellerBInvoices = [
    memoryStorage.createInvoice(buildSeed({ sellerPublicKey: SELLER_B, memo: nextMemo('469-B'), amount: 30 })),
  ];

  const all = memoryStorage.getAllInvoices();
  assert.equal(all.length, 3, 'storage holds all three invoices before seller filter');

  // Filter by sellerPublicKey exactly as the service does.
  const sellerAList = all.filter((inv) => inv.sellerPublicKey === SELLER_A);
  const sellerBList = all.filter((inv) => inv.sellerPublicKey === SELLER_B);

  assert.equal(sellerAList.length, 2, 'seller A list contains only seller A rows');
  assert.equal(sellerBList.length, 1, 'seller B list contains only seller B rows');

  assert.deepEqual(
    sellerAList.map((inv) => inv.id).sort(),
    sellerAInvoices.map((inv) => inv.id).sort(),
    'every seller A row belongs to seller A',
  );
  assert.ok(
    sellerBList.every((inv) => inv.sellerPublicKey === SELLER_B),
    'every seller B row belongs to seller B',
  );
  assert.equal(
    sellerAList.find((inv) => inv.sellerPublicKey === SELLER_B),
    undefined,
    'no cross-leak between seller A and seller B listings',
  );
});
test('markExpiredInvoices transitions past-dated PENDING invoices to EXPIRED', () => {
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  // PENDING invoice with expiresAt in the past — should be marked EXPIRED
  const expiredCandidate = memoryStorage.createInvoice(
    buildSeed({ memo: nextMemo('expire'), expiresAt: pastDate }),
  );
  assert.equal(expiredCandidate.status, 'PENDING', 'starts as PENDING');

  // PENDING invoice with expiresAt in the future — should remain PENDING
  const futureInvoice = memoryStorage.createInvoice(
    buildSeed({ memo: nextMemo('future'), expiresAt: futureDate }),
  );
  assert.equal(futureInvoice.status, 'PENDING', 'future invoice starts as PENDING');

  // PAID invoice — should be untouched
  const paidInvoice = memoryStorage.createInvoice(
    buildSeed({ memo: nextMemo('paid') }),
  );
  memoryStorage.markAsPaid(paidInvoice.id, 'tx-hash-001', 'G' + 'P'.repeat(55));
  const paidFetched = memoryStorage.getInvoiceById(paidInvoice.id);
  assert.equal(paidFetched?.status, 'PAID', 'starts as PAID');

  const count = memoryStorage.markExpiredInvoices();
  assert.equal(count, 1, 'exactly one invoice should be expired');

  // Past-dated PENDING → EXPIRED
  const refreshedExpired = memoryStorage.getInvoiceById(expiredCandidate.id);
  assert.equal(refreshedExpired?.status, 'EXPIRED', 'past-dated PENDING invoice becomes EXPIRED');

  // Future PENDING → unchanged
  const refreshedFuture = memoryStorage.getInvoiceById(futureInvoice.id);
  assert.equal(refreshedFuture?.status, 'PENDING', 'future PENDING invoice stays PENDING');

  // PAID → untouched
  const refreshedPaid = memoryStorage.getInvoiceById(paidInvoice.id);
  assert.equal(refreshedPaid?.status, 'PAID', 'PAID invoice is untouched');
});

