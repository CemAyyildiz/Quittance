/**
 * mvp-fee-bump.test.ts
 *
 * A fee-bump is a valid way to settle an invoice: the wrapper pays the network
 * fee while the inner transaction remains the invoice payment. These tests pin:
 *
 * - a matching inner payment is accepted and the inner source is the payer,
 * - the fee source is never stored as the payer,
 * - a fee bump wrapping a create-account is rejected,
 * - a fee bump of a fee bump is rejected,
 * - the inner source and fee source may be the same account.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Server } from 'http';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const PAYER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const FEE_SOURCE = 'GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V';
const TX_HASH = 'b'.repeat(64);

const getTransaction = vi.fn();

vi.mock('../src/services/stellar.service', () => ({
  default: {
    getTransaction: (hash: string) => getTransaction(hash),
  },
}));

const { default: app } = await import('../src/server-mvp');
const { default: memoryStorage } = await import('../src/storage/memory-storage');

let server: Server;
let baseUrl: string;
let memoCounter = 0;

function seedInvoice() {
  memoCounter += 1;
  return memoryStorage.createInvoice({
    sellerPublicKey: SELLER,
    amount: 1.5,
    assetCode: 'XLM',
    memo: `BUMP-${memoCounter}`,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}

function paymentOperation(source: string = PAYER) {
  return {
    type: 'payment',
    to: SELLER,
    from: source,
    source_account: source,
    amount: '1.5000000',
    asset_type: 'native',
  };
}

function feeBumpReceipt(options: {
  memo: string;
  operations?: any[];
  payer?: string;
  feeSource?: string;
  nested?: boolean;
}) {
  const {
    memo,
    operations = [paymentOperation(options.payer ?? PAYER)],
    payer = PAYER,
    feeSource = FEE_SOURCE,
    nested = false,
  } = options;
  const nowSeconds = Math.floor(Date.now() / 1000);

  const innerTransaction: any = {
    hash: 'f'.repeat(64),
    signatures: ['inner-signature'],
    max_fee: '100',
  };

  if (nested) {
    innerTransaction.inner_transaction = {
      hash: 'g'.repeat(64),
      signatures: ['nested-signature'],
      max_fee: '100',
    };
  }

  return {
    transaction: {
      successful: true,
      memo,
      source_account: payer,
      fee_account: feeSource,
      ledger_sequence: 1,
      created_at: new Date().toISOString(),
      preconditions: { timebounds: { max_time: String(nowSeconds + 3600) } },
      inner_transaction: innerTransaction,
    },
    operations,
  };
}

async function verify(invoiceId: string, txHash: string = TX_HASH) {
  const response = await fetch(`${baseUrl}/api/invoices/${invoiceId}/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ txHash }),
  });
  return { status: response.status, body: (await response.json()) as any };
}

beforeEach(async () => {
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
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('MVP fee-bump verification', () => {
  it('accepts a matching inner payment and records the inner source as payer', async () => {
    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(feeBumpReceipt({ memo: invoice.memo }));

    const { status, body } = await verify(invoice.id);

    expect(status).toBe(200);
    expect(body.data.status).toBe('PAID');

    const stored = memoryStorage.getInvoiceById(invoice.id);
    expect(stored.payerPublicKey).toBe(PAYER);
    expect(stored.payerPublicKey).not.toBe(FEE_SOURCE);
    expect(stored.paymentTxHash).toBe(TX_HASH);
  });

  it('rejects a fee bump that wraps a create-account operation', async () => {
    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(
      feeBumpReceipt({
        memo: invoice.memo,
        operations: [
          {
            type: 'create_account',
            account: PAYER,
            funder: PAYER,
            starting_balance: '1.0000000',
          },
        ],
      }),
    );

    const { status, body } = await verify(invoice.id);

    expect(status).toBe(400);
    expect(body.code).toBe('INVALID_FEE_BUMP');
    expect(memoryStorage.getInvoiceById(invoice.id).status).toBe('PENDING');
  });

  it('rejects a fee-bump of a fee-bump', async () => {
    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(
      feeBumpReceipt({ memo: invoice.memo, nested: true }),
    );

    const { status, body } = await verify(invoice.id);

    expect(status).toBe(400);
    expect(body.code).toBe('INVALID_FEE_BUMP');
    expect(memoryStorage.getInvoiceById(invoice.id).status).toBe('PENDING');
  });

  it('allows the inner source and fee source to be the same account', async () => {
    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(
      feeBumpReceipt({
        memo: invoice.memo,
        payer: FEE_SOURCE,
        feeSource: FEE_SOURCE,
        operations: [paymentOperation(FEE_SOURCE)],
      }),
    );

    const { status, body } = await verify(invoice.id);

    expect(status).toBe(200);
    expect(body.data.status).toBe('PAID');
    expect(memoryStorage.getInvoiceById(invoice.id).payerPublicKey).toBe(FEE_SOURCE);
  });
});
