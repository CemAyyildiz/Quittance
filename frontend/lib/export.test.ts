import { describe, it, expect } from 'vitest';
import {
  escapePrintHtml,
  generateInvoiceCSV,
  getStellarExpertTransactionUrl,
} from './export';

describe('escapePrintHtml', () => {
  it('escapes HTML-significant characters', () => {
    expect(escapePrintHtml(`<tag data-value="'&">`)).toBe(
      '&lt;tag data-value=&quot;&#39;&amp;&quot;&gt;',
    );
  });
});

describe('getStellarExpertTransactionUrl', () => {
  it('accepts only canonical 64-char hex hashes', () => {
    const hash = 'A1'.repeat(32);
    expect(getStellarExpertTransactionUrl(hash, 'Mainnet')).toBe(
      `https://stellar.expert/explorer/public/tx/${hash}`,
    );
    expect(getStellarExpertTransactionUrl(` ${hash} `, 'Testnet')).toBe(
      `https://stellar.expert/explorer/testnet/tx/${hash}`,
    );
    expect(getStellarExpertTransactionUrl(`${hash}" onclick="alert(1)`, 'Mainnet')).toBeUndefined();
    expect(getStellarExpertTransactionUrl('javascript:alert(1)', 'Mainnet')).toBeUndefined();
  });
});

describe('generateInvoiceCSV', () => {
  it('includes expanded proof columns and escapes commas via csvRow', () => {
    const csv = generateInvoiceCSV([
      {
        id: 'inv-1',
        amount: 10,
        assetCode: 'XLM',
        status: 'PAID',
        createdAt: '2026-07-25T10:00:00.000Z',
        expiresAt: '2026-08-25T10:00:00.000Z',
        paidAt: '2026-07-26T10:00:00.000Z',
        memo: 'memo-1',
        sellerPublicKey: 'G' + 'A'.repeat(55),
        sellerName: 'Seller, Inc',
        customerName: 'Client',
        description: 'Design work',
        paymentTxHash: 'a'.repeat(64),
      },
    ]);
    expect(csv.split('\n')[0]).toContain('Seller Name');
    expect(csv.split('\n')[0]).toContain('Customer Name');
    expect(csv).toContain('"Seller, Inc"');
    expect(csv).toContain('Design work');
  });
});
