/**
 * The anchor and partial-payment writes are seller-only and only accept a
 * confirmed on-chain transaction. These tests drive the HTTP endpoints and
 * assert that a caller who cannot prove ownership or a real transaction
 * changes nothing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'http';
import * as StellarSdk from '@stellar/stellar-sdk';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const OTHER_SELLER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const PAYER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const CONTRACT_ID = 'C' + 'A'.repeat(55);
const ANCHOR_TX_HASH = 'c'.repeat(64);
const PAYMENT_TX_HASH = 'd'.repeat(64);

const getTransaction = vi.fn();

vi.mock('../src/services/stellar.service', () => ({
  default: {
    getTransaction: (hash: string) => getTransaction(hash),
  },
}));

const { default: app } = await import('../src/server-mvp');
const { default: memoryStorage } = await import('../src/storage/memory-storage');
const { computeCanonicalDigest } = await import('../src/utils/canonical-proof');

let server: Server;
let baseUrl: string;
let memoCounter = 0;

function seedInvoice(amount = 1.5) {
  memoCounter += 1;
  return memoryStorage.createInvoice({
    sellerPublicKey: SELLER,
    amount,
    assetCode: 'XLM',
    memo: `AUTH-${memoCounter}`,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}

function seedPaidInvoice() {
  const invoice = seedInvoice();
  return memoryStorage.markAsPaid(invoice.id, 'e'.repeat(64), PAYER, { ledger: 42 })!;
}

function anchorReceipt(overrides: { source?: string; invoiceId?: string; digest?: string } = {}) {
  const invoiceId = overrides.invoiceId;
  const digest = overrides.digest;
  return {
    transaction: { successful: true, source_account: overrides.source ?? SELLER },
    operations: [
      {
        type: 'invoke_host_function',
        function: {
          invoke_contract: {
            contract_id: CONTRACT_ID,
            function_name: 'anchor',
            args: [
              StellarSdk.nativeToScVal(invoiceId, { type: 'string' }).toXDR('base64'),
              StellarSdk.nativeToScVal(Buffer.from(digest!, 'hex'), { type: 'bytes' }).toXDR('base64'),
            ],
          },
        },
      },
    ],
  };
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
  process.env.RECEIPT_ANCHOR_CONTRACT_ID = CONTRACT_ID;
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
  delete process.env.RECEIPT_ANCHOR_CONTRACT_ID;
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('POST /api/invoices/:id/anchor', () => {
  it('refuses a caller that omits sellerPublicKey', async () => {
    const invoice = seedPaidInvoice();
    const digest = computeCanonicalDigest(invoice);

    const { status } = await call('POST', `/api/invoices/${invoice.id}/anchor`, {
      digest,
      txHash: ANCHOR_TX_HASH,
    });

    expect(status).toBe(403);
    expect(getTransaction).not.toHaveBeenCalled();
    expect(memoryStorage.getInvoiceById(invoice.id)?.anchoringTxHash).toBeUndefined();
  });

  it('refuses a seller that does not own the invoice', async () => {
    const invoice = seedPaidInvoice();
    const digest = computeCanonicalDigest(invoice);

    const { status } = await call('POST', `/api/invoices/${invoice.id}/anchor`, {
      digest,
      txHash: ANCHOR_TX_HASH,
      sellerPublicKey: OTHER_SELLER,
    });

    expect(status).toBe(403);
    expect(memoryStorage.getInvoiceById(invoice.id)?.anchoringTxHash).toBeUndefined();
  });

  it('does not store a hash missing from the chain', async () => {
    const invoice = seedPaidInvoice();
    const digest = computeCanonicalDigest(invoice);
    getTransaction.mockRejectedValueOnce(new Error('Transaction not found'));

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/anchor`, {
      digest,
      txHash: ANCHOR_TX_HASH,
      sellerPublicKey: SELLER,
    });

    expect(status).toBe(400);
    expect(body.code).toBe('ANCHOR_TX_NOT_FOUND');
    expect(memoryStorage.getInvoiceById(invoice.id)?.anchoringTxHash).toBeUndefined();
  });

  it('does not store a transaction that is not the anchor call', async () => {
    const invoice = seedPaidInvoice();
    const digest = computeCanonicalDigest(invoice);
    getTransaction.mockResolvedValueOnce({
      transaction: { successful: true, source_account: SELLER },
      operations: [{ type: 'payment' }],
    });

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/anchor`, {
      digest,
      txHash: ANCHOR_TX_HASH,
      sellerPublicKey: SELLER,
    });

    expect(status).toBe(400);
    expect(body.code).toBe('ANCHOR_TX_MISMATCH');
    expect(memoryStorage.getInvoiceById(invoice.id)?.anchoringTxHash).toBeUndefined();
  });

  it('stores the hash of a confirmed seller anchor call', async () => {
    const invoice = seedPaidInvoice();
    const digest = computeCanonicalDigest(invoice);
    getTransaction.mockResolvedValueOnce(anchorReceipt({ invoiceId: invoice.id, digest }));

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/anchor`, {
      digest,
      txHash: ANCHOR_TX_HASH,
      sellerPublicKey: SELLER,
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(memoryStorage.getInvoiceById(invoice.id)?.anchoringTxHash).toBe(ANCHOR_TX_HASH);
  });
});

describe('POST /api/invoices/:id/partial-payment', () => {
  it('refuses a caller that omits sellerPublicKey and appends no history', async () => {
    const invoice = seedInvoice();

    const { status } = await call('POST', `/api/invoices/${invoice.id}/partial-payment`, {
      txHash: PAYMENT_TX_HASH,
    });

    expect(status).toBe(403);
    expect(memoryStorage.getStatusHistory(invoice.id).map((row) => row.status)).toEqual([
      'CREATED',
    ]);
  });

  it('refuses a seller that does not own the invoice', async () => {
    const invoice = seedInvoice();

    const { status } = await call('POST', `/api/invoices/${invoice.id}/partial-payment`, {
      txHash: PAYMENT_TX_HASH,
      sellerPublicKey: OTHER_SELLER,
    });

    expect(status).toBe(403);
    expect(memoryStorage.getStatusHistory(invoice.id).map((row) => row.status)).toEqual([
      'CREATED',
    ]);
  });

  it('does not record a full payment as partial', async () => {
    const invoice = seedInvoice(1.5);
    getTransaction.mockResolvedValueOnce({
      transaction: { memo: invoice.memo, memo_type: 'text', source_account: PAYER },
      operations: [
        {
          type: 'payment',
          to: SELLER,
          from: PAYER,
          amount: '1.5000000',
          asset_type: 'native',
        },
      ],
    });

    const { status } = await call('POST', `/api/invoices/${invoice.id}/partial-payment`, {
      txHash: PAYMENT_TX_HASH,
      sellerPublicKey: SELLER,
    });

    expect(status).toBe(400);
    expect(memoryStorage.getStatusHistory(invoice.id).map((row) => row.status)).toEqual([
      'CREATED',
    ]);
  });

  it('records a confirmed partial payment for the owning seller', async () => {
    const invoice = seedInvoice(1.5);
    getTransaction.mockResolvedValueOnce({
      transaction: { memo: invoice.memo, memo_type: 'text', source_account: PAYER },
      operations: [
        {
          type: 'payment',
          to: SELLER,
          from: PAYER,
          amount: '0.5000000',
          asset_type: 'native',
        },
      ],
    });

    const { status, body } = await call('POST', `/api/invoices/${invoice.id}/partial-payment`, {
      txHash: PAYMENT_TX_HASH,
      sellerPublicKey: SELLER,
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(memoryStorage.getStatusHistory(invoice.id).map((row) => row.status)).toEqual([
      'CREATED',
      'PARTIALLY_PAID',
    ]);
  });
});
