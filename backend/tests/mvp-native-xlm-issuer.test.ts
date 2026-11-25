import { beforeEach, describe, expect, it } from 'vitest';

import memoryStorage from '../src/storage/memory-storage';
import invoiceMemoryService from '../src/services/invoice-memory.service';

const SELLER = 'G' + 'A'.repeat(55);
const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

describe('native XLM invoices do not store an issuer (#1137)', () => {
  beforeEach(() => {
    memoryStorage.clear();
  });

  it('drops an explicit issuer when the asset is native XLM', async () => {
    const created = await invoiceMemoryService.createInvoice({
      sellerPublicKey: SELLER,
      amount: 10,
      assetCode: 'XLM',
      assetIssuer: USDC_ISSUER,
    });

    expect(created.assetCode).toBe('XLM');
    expect(created.assetIssuer).toBeUndefined();

    const read = await invoiceMemoryService.getInvoiceById(created.id);
    expect(read.assetCode).toBe('XLM');
    expect(read.assetIssuer).toBeUndefined();
  });

  it('drops an issuer when the asset code is omitted (native XLM default)', async () => {
    const created = await invoiceMemoryService.createInvoice({
      sellerPublicKey: SELLER,
      amount: 10,
      assetIssuer: USDC_ISSUER,
    });

    expect(created.assetCode).toBe('XLM');
    expect(created.assetIssuer).toBeUndefined();

    const read = await invoiceMemoryService.getInvoiceById(created.id);
    expect(read.assetCode).toBe('XLM');
    expect(read.assetIssuer).toBeUndefined();
  });

  it('keeps the issuer for a USDC invoice', async () => {
    const created = await invoiceMemoryService.createInvoice({
      sellerPublicKey: SELLER,
      amount: 10,
      assetCode: 'USDC',
      assetIssuer: USDC_ISSUER,
    });

    expect(created.assetCode).toBe('USDC');
    expect(created.assetIssuer).toBe(USDC_ISSUER);

    const read = await invoiceMemoryService.getInvoiceById(created.id);
    expect(read.assetCode).toBe('USDC');
    expect(read.assetIssuer).toBe(USDC_ISSUER);
  });
});
