import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'http';
import { encodeMuxedAccount, encodeMuxedAccountToAddress } from '@stellar/stellar-sdk';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const PAYER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const muxed = (id: string) => encodeMuxedAccountToAddress(encodeMuxedAccount(SELLER, id), true);
const SELLER_MUXED = muxed('42');
const OTHER_MUXED = muxed('43');
const TX_HASH = 'a'.repeat(64);
const getTransaction = vi.fn();

vi.mock('../src/services/stellar.service', () => ({
  default: { getTransaction: (hash: string) => getTransaction(hash) },
}));

const { default: app } = await import('../src/server-mvp');
const { default: memoryStorage } = await import('../src/storage/memory-storage');

let server: Server;
let baseUrl: string;

async function call(method: 'GET' | 'POST', path: string, body?: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: (await response.json()) as any };
}

function horizonPayment(memo: string, destination: Record<string, unknown>) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return {
    transaction: {
      successful: true,
      memo,
      ledger_sequence: 12345,
      source_account: PAYER,
      created_at: new Date().toISOString(),
      preconditions: { timebounds: { max_time: String(nowSeconds + 3600) } },
    },
    operations: [{
      type: 'payment',
      to: SELLER,
      from: PAYER,
      amount: '1.5000000',
      asset_type: 'native',
      ...destination,
    }],
  };
}

beforeEach(async () => {
  memoryStorage.clear();
  getTransaction.mockReset();
  await new Promise<void>((resolve) => { server = app.listen(0, () => resolve()); });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('muxed seller invoice', () => {
  async function create(sellerPublicKey: string) {
    return call('POST', '/api/invoices', { amount: 1.5, sellerPublicKey, memo: 'INV-MUXED' });
  }

  it('stores the base and M address and uses M in the payment URI', async () => {
    const { status, body } = await create(SELLER_MUXED);
    expect(status).toBe(201);
    expect(body.data.invoice).toMatchObject({
      sellerPublicKey: SELLER,
      sellerMuxedAddress: SELLER_MUXED,
    });
    expect(body.data.stellarPaymentUri).toContain(`destination=${SELLER_MUXED}`);

    const paymentInfo = await call('GET', `/api/invoices/${body.data.invoice.id}/payment-info`);
    expect(paymentInfo.body.data.stellarPaymentUri).toContain(`destination=${SELLER_MUXED}`);
    expect(paymentInfo.body.data.invoice.sellerMuxedAddress).toBe(SELLER_MUXED);
  });

  it('accepts a matching muxed destination reported by Horizon', async () => {
    const { body } = await create(SELLER_MUXED);
    const invoice = body.data.invoice;
    getTransaction.mockResolvedValue(horizonPayment(invoice.memo, {
      to_muxed: SELLER_MUXED,
      to_muxed_id: '42',
    }));
    const verified = await call('POST', `/api/invoices/${invoice.id}/verify`, { txHash: TX_HASH });
    expect(verified.status).toBe(200);
    expect(verified.body.data.status).toBe('PAID');
  });

  it('accepts a bare base-account payment with the invoice memo', async () => {
    const { body } = await create(SELLER_MUXED);
    const invoice = body.data.invoice;
    getTransaction.mockResolvedValue(horizonPayment(invoice.memo, {}));
    const verified = await call('POST', `/api/invoices/${invoice.id}/verify`, { txHash: TX_HASH });
    expect(verified.status).toBe(200);
  });

  it('rejects another muxed id on the same base account', async () => {
    const { body } = await create(SELLER_MUXED);
    const invoice = body.data.invoice;
    getTransaction.mockResolvedValue(horizonPayment(invoice.memo, {
      to_muxed: OTHER_MUXED,
      to_muxed_id: '43',
    }));
    const verified = await call('POST', `/api/invoices/${invoice.id}/verify`, { txHash: TX_HASH });
    expect(verified.status).toBe(400);
    expect(verified.body.code).toBe('DESTINATION_MISMATCH');
  });

  it('keeps plain G invoices unmuxed and rejects malformed M addresses', async () => {
    const plain = await create(SELLER);
    expect(plain.status).toBe(201);
    expect(plain.body.data.invoice.sellerPublicKey).toBe(SELLER);
    expect(plain.body.data.invoice.sellerMuxedAddress).toBeUndefined();

    const malformed = await create(`${SELLER_MUXED.slice(0, -1)}!`);
    expect(malformed.status).toBe(400);
  });
});
