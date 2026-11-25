/**
 * mvp-webhook.test.ts
 *
 * Paid-invoice webhooks for the MVP backend (issue #996), driven over HTTP
 * against a local receiver with Horizon mocked:
 *
 * - one POST per transition into paid, signed with HMAC-SHA256,
 * - a failing receiver is retried with backoff and then dropped,
 * - the invoice stays paid when delivery fails,
 * - a second verify on the same invoice sends nothing,
 * - with the env vars unset nothing is delivered and verify is unchanged,
 * - a missing secret is logged and disables delivery,
 * - the secret never reaches a response or a log line.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer, type Server } from 'http';
import type { AddressInfo } from 'net';
import { createHmac } from 'crypto';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const PAYER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const SECRET = 'test-webhook-secret';
const TX_HASH = 'e'.repeat(64);

const getTransaction = vi.fn();

vi.mock('../src/services/stellar.service', () => ({
  default: {
    getTransaction: (hash: string) => getTransaction(hash),
  },
}));

const { default: app } = await import('../src/server-mvp');
const { default: memoryStorage } = await import('../src/storage/memory-storage');
const { default: invoiceService } = await import('../src/services/invoice-memory.service');
const { waitForWebhookDeliveries } = await import('../src/services/webhook.service');
const { default: logger } = await import('../src/utils/log');

const originalWebhookUrl = process.env.WEBHOOK_URL;
const originalWebhookSecret = process.env.WEBHOOK_SECRET;

interface ReceivedRequest {
  raw: string;
  headers: Record<string, string | string[] | undefined>;
  receivedAt: number;
}

let apiServer: Server;
let baseUrl: string;
let receiver: Server;
let received: ReceivedRequest[];
let receiverStatus: number;
let memoCounter = 0;

function seedInvoice() {
  memoCounter += 1;
  return memoryStorage.createInvoice({
    sellerPublicKey: SELLER,
    amount: 1.5,
    assetCode: 'XLM',
    memo: `HOOK-${memoCounter}`,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}

function matchingHorizonTx(memo: string) {
  const createdAt = new Date();
  const validBefore = new Date(createdAt.getTime() + 5 * 60 * 1000);
  return {
    transaction: {
      memo,
      memo_type: 'text',
      source_account: PAYER,
      ledger_sequence: 1,
      successful: true,
      created_at: createdAt.toISOString(),
      valid_before: validBefore.toISOString(),
    },
    operations: [
      {
        type: 'payment',
        to: SELLER,
        from: PAYER,
        amount: '1.5000000',
        asset_type: 'native',
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

async function verify(invoiceId: string, txHash: string = TX_HASH) {
  return call('POST', `/api/invoices/${invoiceId}/verify`, { txHash });
}

function expectedSignature(raw: string) {
  return `sha256=${createHmac('sha256', SECRET).update(raw).digest('hex')}`;
}

beforeEach(async () => {
  memoryStorage.clear();
  memoCounter = 0;
  received = [];
  receiverStatus = 200;
  getTransaction.mockReset();

  receiver = createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      received.push({ raw, headers: req.headers, receivedAt: Date.now() });
      res.statusCode = receiverStatus;
      res.end('ok');
    });
  });

  await new Promise<void>((resolve) => receiver.listen(0, '127.0.0.1', () => resolve()));
  const receiverAddress = receiver.address() as AddressInfo;

  process.env.WEBHOOK_URL = `http://127.0.0.1:${receiverAddress.port}/hook`;
  process.env.WEBHOOK_SECRET = SECRET;

  await new Promise<void>((resolve) => {
    apiServer = app.listen(0, () => resolve());
  });

  const address = apiServer.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterEach(async () => {
  await waitForWebhookDeliveries();

  await new Promise<void>((resolve) => apiServer.close(() => resolve()));
  receiver.closeAllConnections?.();
  await new Promise<void>((resolve) => receiver.close(() => resolve()));

  if (originalWebhookUrl === undefined) delete process.env.WEBHOOK_URL;
  else process.env.WEBHOOK_URL = originalWebhookUrl;

  if (originalWebhookSecret === undefined) delete process.env.WEBHOOK_SECRET;
  else process.env.WEBHOOK_SECRET = originalWebhookSecret;

  vi.restoreAllMocks();
});

describe('paid-invoice webhook', () => {
  it('sends one signed POST with the invoice payment fields', async () => {
    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(matchingHorizonTx(invoice.memo));

    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const response = await verify(invoice.id);
    await waitForWebhookDeliveries();
    const logged = stdout.mock.calls.map((args) => String(args[0])).join('');
    stdout.mockRestore();

    expect(response.status).toBe(200);
    expect(received).toHaveLength(1);

    const { raw, headers } = received[0];
    expect(JSON.parse(raw)).toEqual({
      invoiceId: invoice.id,
      amount: 1.5,
      asset: 'XLM',
      memo: invoice.memo,
      payer: PAYER,
      txHash: TX_HASH,
    });
    expect(headers['x-quittance-signature']).toBe(expectedSignature(raw));

    // The secret is never echoed in the response or written to a log line.
    expect(JSON.stringify(response.body)).not.toContain(SECRET);
    expect(logged).not.toContain(SECRET);
  });

  it('retries a failed delivery with backoff and then succeeds', async () => {
    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(matchingHorizonTx(invoice.memo));
    receiverStatus = 500;

    let failures = 2;
    receiver.removeAllListeners('request');
    receiver.on('request', (req, res) => {
      let raw = '';
      req.on('data', (chunk) => {
        raw += chunk;
      });
      req.on('end', () => {
        received.push({ raw, headers: req.headers, receivedAt: Date.now() });
        const failing = failures > 0;
        if (failing) failures -= 1;
        res.statusCode = failing ? 500 : 200;
        res.end('ok');
      });
    });

    const response = await verify(invoice.id);
    await waitForWebhookDeliveries();

    expect(response.status).toBe(200);
    expect(received).toHaveLength(3);

    const firstGap = received[1].receivedAt - received[0].receivedAt;
    const secondGap = received[2].receivedAt - received[1].receivedAt;
    expect(firstGap).toBeGreaterThanOrEqual(400);
    expect(secondGap).toBeGreaterThanOrEqual(800);

    const after = await call('GET', `/api/invoices/${invoice.id}`);
    expect(after.body.data.status).toBe('PAID');
  });

  it('drops a delivery after the retries and leaves the invoice paid', async () => {
    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(matchingHorizonTx(invoice.memo));
    receiverStatus = 500;

    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    const response = await verify(invoice.id);
    await waitForWebhookDeliveries();

    expect(response.status).toBe(200);
    expect(received).toHaveLength(3);
    expect(error).toHaveBeenCalled();
    expect(JSON.stringify(error.mock.calls)).not.toContain(SECRET);

    const after = await call('GET', `/api/invoices/${invoice.id}`);
    expect(after.body.data.status).toBe('PAID');
  });

  it('does not send a second webhook when the same invoice is verified twice', async () => {
    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(matchingHorizonTx(invoice.memo));

    const first = await verify(invoice.id);
    const second = await verify(invoice.id);
    await waitForWebhookDeliveries();

    expect(first.status).toBe(200);
    expect(second.status).toBe(400);
    expect(second.body.code).toBe('INVOICE_ALREADY_PAID');
    expect(received).toHaveLength(1);
  });

  it('does not re-update or re-send when markAsPaid is called for a paid invoice', async () => {
    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(matchingHorizonTx(invoice.memo));

    await verify(invoice.id);
    await waitForWebhookDeliveries();

    const repeated = await invoiceService.markAsPaid(
      invoice.id,
      'f'.repeat(64),
      PAYER,
    );
    await waitForWebhookDeliveries();

    expect(repeated.paymentTxHash).toBe(TX_HASH);
    expect(received).toHaveLength(1);
  });

  it('behaves exactly as before when the webhook env vars are unset', async () => {
    delete process.env.WEBHOOK_URL;
    delete process.env.WEBHOOK_SECRET;

    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(matchingHorizonTx(invoice.memo));

    const response = await verify(invoice.id);
    await waitForWebhookDeliveries();

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('PAID');
    expect(received).toHaveLength(0);
  });

  it('disables delivery and logs why when the secret is missing', async () => {
    delete process.env.WEBHOOK_SECRET;

    const warning = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

    const invoice = seedInvoice();
    getTransaction.mockResolvedValue(matchingHorizonTx(invoice.memo));

    const response = await verify(invoice.id);
    await waitForWebhookDeliveries();

    expect(response.status).toBe(200);
    expect(received).toHaveLength(0);
    expect(warning).toHaveBeenCalledTimes(1);
    expect(String(warning.mock.calls[0][0])).toContain('WEBHOOK_SECRET');
  });
});
