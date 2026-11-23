import { beforeEach, describe, it, expect } from 'vitest';

import memoryStorage from '../src/storage/memory-storage';
import invoiceMemoryService from '../src/services/invoice-memory.service';
import { verifyInvoicePayment } from '../src/utils/verify-invoice-payment';

const seller = 'G' + 'A'.repeat(55);
const payer = 'G' + 'B'.repeat(55);

describe('invoice status history', () => {
  beforeEach(() => {
    memoryStorage.clear();
  });

  it('walks create -> partial payment -> paid and asserts three rows, oldest first', async () => {
    const invoice = await invoiceMemoryService.createInvoice({
      sellerPublicKey: seller,
      amount: 10,
      assetCode: 'XLM',
      customerEmail: 'private@example.com',
    } as any);

    let history = await invoiceMemoryService.getStatusHistory(invoice.id);
    expect(history.map((row) => row.status)).toEqual(['CREATED']);
    expect(history[0].txHash).toBeUndefined();

    await invoiceMemoryService.recordPartialPayment(invoice.id, 'TX_PARTIAL');
    await invoiceMemoryService.markAsPaid(invoice.id, 'TX_PAID', payer, 42);

    history = await invoiceMemoryService.getStatusHistory(invoice.id);
    expect(history).toHaveLength(3);
    expect(history.map((row) => row.status)).toEqual([
      'CREATED',
      'PARTIALLY_PAID',
      'PAID',
    ]);
    expect(history[1].txHash).toBe('TX_PARTIAL');
    expect(history[2].txHash).toBe('TX_PAID');
    expect(history[0].at.getTime()).toBeLessThanOrEqual(history[1].at.getTime());
    expect(history[1].at.getTime()).toBeLessThanOrEqual(history[2].at.getTime());

    // PII is never part of a history row.
    expect(JSON.stringify(history)).not.toContain('private@example.com');
  });

  it('collapses two identical transitions in one request into one row', async () => {
    const invoice = await invoiceMemoryService.createInvoice({
      sellerPublicKey: seller,
      amount: 5,
      assetCode: 'XLM',
    } as any);

    const at = new Date();
    memoryStorage.appendStatusEvent(invoice.id, 'PARTIALLY_PAID', 'TX_SAME', at);
    memoryStorage.appendStatusEvent(invoice.id, 'PARTIALLY_PAID', 'TX_SAME', at);

    const rows = memoryStorage
      .getStatusHistory(invoice.id)
      .filter((row) => row.status === 'PARTIALLY_PAID');
    expect(rows).toHaveLength(1);
  });

  it('records EXTENDED, VOIDED and REFUNDED transitions', async () => {
    const invoice = await invoiceMemoryService.createInvoice({
      sellerPublicKey: seller,
      amount: 5,
      assetCode: 'XLM',
    } as any);

    await invoiceMemoryService.extendInvoice(invoice.id, 3);
    await invoiceMemoryService.cancelInvoice(invoice.id);

    let history = await invoiceMemoryService.getStatusHistory(invoice.id);
    expect(history.map((row) => row.status)).toEqual(['CREATED', 'EXTENDED', 'VOIDED']);

    const paid = await invoiceMemoryService.createInvoice({
      sellerPublicKey: seller,
      amount: 7,
      assetCode: 'XLM',
    } as any);
    await invoiceMemoryService.markAsPaid(paid.id, 'TX_PAY', payer, 43);
    await invoiceMemoryService.recordRefund(paid.id, 'TX_REFUND');
    history = await invoiceMemoryService.getStatusHistory(paid.id);
    expect(history.map((row) => row.status)).toEqual(['CREATED', 'PAID', 'REFUNDED']);
  });

  it('a failed verify appends nothing', async () => {
    const invoice = await invoiceMemoryService.createInvoice({
      sellerPublicKey: seller,
      amount: 10,
      assetCode: 'XLM',
    } as any);

    const mismatch = verifyInvoicePayment({
      txMemo: 'OTHER',
      invoiceMemo: invoice.memo,
      paymentTo: seller,
      invoiceSellerPublicKey: seller,
      paymentAmount: '10.0000000',
      invoiceAmount: 10,
      paymentAsset: 'XLM',
      invoiceAssetCode: 'XLM',
    });
    expect(mismatch.ok).toBe(false);

    // Only the CREATED row from the create transition exists.
    expect(memoryStorage.getStatusHistory(invoice.id).map((row) => row.status)).toEqual(['CREATED']);
  });
});
