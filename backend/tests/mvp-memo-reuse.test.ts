/**
 * mvp-memo-reuse.test.ts
 *
 * The MVP create endpoint is driven over HTTP (ephemeral port) to prove a memo
 * can identify at most one open invoice:
 *
 * - a memo used by a pending invoice is refused with 409, whatever the seller,
 * - the error leaks no seller, email or amount of the other invoice,
 * - memos of paid / expired / cancelled invoices can be used again,
 * - comparison is exact (case-sensitive),
 * - concurrent creates with one memo yield a single 201 and the rest 409,
 * - generated memos retry on collision and then fail clearly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Server } from 'http';

const SELLER_A = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const SELLER_B = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

const generateInvoiceMemo = vi.fn();

vi.mock('../src/utils/memo', async () => {
  const actual = await vi.importActual<typeof import('../src/utils/memo')>('../src/utils/memo');
  return {
    ...actual,
    generateInvoiceMemo: () => generateInvoiceMemo(),
  };
});

const { default: app } = await import('../src/server-mvp');
const { default: memoryStorage } = await import('../src/storage/memory-storage');
const { MAX_MEMO_GENERATION_ATTEMPTS } = await import('../src/utils/memo');
const actualMemo = await vi.importActual<typeof import('../src/utils/memo')>('../src/utils/memo');

let server: Server;
let baseUrl: string;

async function createInvoice(body: Record<string, unknown>) {
  const response = await fetch(`${baseUrl}/api/invoices`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ amount: 12.34, sellerPublicKey: SELLER_A, ...body }),
  });
  return { status: response.status, body: (await response.json()) as any };
}

beforeEach(async () => {
  memoryStorage.clear();
  generateInvoiceMemo.mockReset();
  generateInvoiceMemo.mockImplementation(() => actualMemo.generateInvoiceMemo());

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

describe('MVP memo reuse', () => {
  it('rejects a memo already used by a pending invoice of another seller', async () => {
    const first = await createInvoice({
      memo: 'ORDER-1',
      customerEmail: 'secret-client@example.com',
      amount: 987.65,
    });
    expect(first.status).toBe(201);

    const second = await createInvoice({ memo: 'ORDER-1', sellerPublicKey: SELLER_B, amount: 5 });

    expect(second.status).toBe(409);
    expect(second.body.success).toBe(false);
    expect(second.body.code).toBe('MEMO_IN_USE');

    const payload = JSON.stringify(second.body);
    expect(payload).not.toContain(SELLER_A);
    expect(payload).not.toContain('secret-client@example.com');
    expect(payload).not.toContain('987.65');
    expect(memoryStorage.size()).toBe(1);
  });

  it('rejects a memo reused by the same seller while the invoice is pending', async () => {
    await createInvoice({ memo: 'ORDER-2' });
    const again = await createInvoice({ memo: 'ORDER-2' });

    expect(again.status).toBe(409);
  });

  it.each(['PAID', 'EXPIRED', 'CANCELLED'] as const)(
    'allows reusing a memo whose only invoice is %s',
    async (status) => {
      const first = await createInvoice({ memo: 'ORDER-3' });
      memoryStorage.updateInvoice(first.body.data.invoice.id, { status });

      const again = await createInvoice({ memo: 'ORDER-3' });

      expect(again.status).toBe(201);
      expect(again.body.data.invoice.memo).toBe('ORDER-3');
    },
  );

  it('compares memos exactly, including case', async () => {
    await createInvoice({ memo: 'Order-4' });

    const differentCase = await createInvoice({ memo: 'order-4' });

    expect(differentCase.status).toBe(201);
  });

  it('accepts only one of several concurrent creates with the same memo', async () => {
    const results = await Promise.all(
      Array.from({ length: 4 }, () => createInvoice({ memo: 'ORDER-5' })),
    );

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(3);
    expect(memoryStorage.size()).toBe(1);
  });

  it('retries a generated memo that collides and then succeeds', async () => {
    await createInvoice({ memo: 'INV-TAKEN-AAAA' });
    generateInvoiceMemo
      .mockReturnValueOnce('INV-TAKEN-AAAA')
      .mockReturnValueOnce('INV-FREE-BBBB');

    const created = await createInvoice({});

    expect(created.status).toBe(201);
    expect(created.body.data.invoice.memo).toBe('INV-FREE-BBBB');
    expect(generateInvoiceMemo).toHaveBeenCalledTimes(2);
  });

  it('fails clearly when every generated memo collides', async () => {
    await createInvoice({ memo: 'INV-TAKEN-AAAA' });
    generateInvoiceMemo.mockReturnValue('INV-TAKEN-AAAA');

    const failed = await createInvoice({});

    expect(failed.status).toBe(503);
    expect(failed.body.code).toBe('MEMO_GENERATION_FAILED');
    expect(generateInvoiceMemo).toHaveBeenCalledTimes(MAX_MEMO_GENERATION_ATTEMPTS);
    expect(memoryStorage.size()).toBe(1);
  });
});
