import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'http';

const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const OTHER_SELLER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const PAYER = 'GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V';

const { default: app } = await import('../src/server-mvp');
const { default: memoryStorage } = await import('../src/storage/memory-storage');

let server: Server;
let baseUrl: string;

function seedInvoice(memo: string, sellerPublicKey = SELLER) {
  return memoryStorage.createInvoice({
    sellerPublicKey,
    amount: 1.5,
    assetCode: 'XLM',
    memo,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}

beforeEach(async () => {
  memoryStorage.clear();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  vi.restoreAllMocks();
});

describe('MVP invoice CSV export', () => {
  it('exports every seller invoice across pages and excludes other sellers', async () => {
    for (let index = 0; index < 101; index += 1) {
      seedInvoice(`CSV-${index}`);
    }
    seedInvoice('OTHER-SELLER', OTHER_SELLER);

    const response = await fetch(
      `${baseUrl}/api/invoices/export.csv?sellerPublicKey=${SELLER}&status=all`,
    );
    const csv = (await response.text()).replace(/^\uFEFF/, '');

    expect(response.status).toBe(200);
    expect(csv.split('\n')).toHaveLength(102);
    expect(csv).toContain('CSV-100');
    expect(csv).not.toContain('OTHER-SELLER');
  });

  it('defaults to paid invoices and returns a header for an empty export', async () => {
    const paid = seedInvoice('PAID-CSV');
    memoryStorage.markAsPaid(paid.id, 'a'.repeat(64), PAYER, { ledger: 1 });
    seedInvoice('PENDING-CSV');

    const response = await fetch(
      `${baseUrl}/api/invoices/export.csv?sellerPublicKey=${SELLER}`,
    );
    const csv = (await response.text()).replace(/^\uFEFF/, '');

    expect(response.status).toBe(200);
    expect(csv).toContain('PAID-CSV');
    expect(csv).not.toContain('PENDING-CSV');

    const emptyResponse = await fetch(
      `${baseUrl}/api/invoices/export.csv?sellerPublicKey=${OTHER_SELLER}`,
    );
    const emptyCsv = (await emptyResponse.text()).replace(/^\uFEFF/, '');

    expect(emptyResponse.status).toBe(200);
    expect(emptyCsv.split('\n')).toHaveLength(1);
  });
});
