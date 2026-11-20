import { beforeEach, describe, expect, it } from 'vitest';

import memoryStorage from '../src/storage/memory-storage';
import invoiceMemoryService from '../src/services/invoice-memory.service';
import { computeCanonicalDigest } from '../src/utils/canonical-proof';
import { AnchorError, AnchorErrorCode } from '../src/utils/canonical-proof';

const seller = 'G' + 'A'.repeat(55);
const payer = 'G' + 'B'.repeat(55);
const txHash = 'ab'.repeat(32);
const anchorTxHash = 'cd'.repeat(32);

function paidInvoice() {
  const invoice = memoryStorage.createInvoice({
    sellerPublicKey: seller,
    amount: 10,
    assetCode: 'XLM',
    memo: 'INV-ANCHOR-1',
    id: '11111111-1111-1111-1111-111111111111',
  });
  return memoryStorage.markAsPaid(invoice.id, txHash, payer, 12345)!;
}

describe('proof anchoring', () => {
  beforeEach(() => memoryStorage.clear());

  it('refuses a digest that does not match the invoice', async () => {
    const invoice = paidInvoice();
    const digest = computeCanonicalDigest(invoice);

    await expect(
      invoiceMemoryService.anchorProof(invoice.id, '00'.repeat(32), anchorTxHash),
    ).rejects.toMatchObject({ code: AnchorErrorCode.DIGEST_MISMATCH });

    expect(memoryStorage.getInvoiceById(invoice.id)?.anchoringTxHash).toBeUndefined();
    // The canonical digest is reproducible and stable.
    expect(computeCanonicalDigest(invoice)).toBe(digest);
  });

  it('stores the anchoring tx hash once and rejects a second anchor', async () => {
    const invoice = paidInvoice();
    const digest = computeCanonicalDigest(invoice);

    const updated = await invoiceMemoryService.anchorProof(invoice.id, digest, anchorTxHash);
    expect(updated.anchoringTxHash).toBe(anchorTxHash);

    await expect(
      invoiceMemoryService.anchorProof(invoice.id, digest, anchorTxHash),
    ).rejects.toBeInstanceOf(AnchorError);
    await expect(
      invoiceMemoryService.anchorProof(invoice.id, digest, anchorTxHash),
    ).rejects.toMatchObject({ code: AnchorErrorCode.ALREADY_ANCHORED });
  });

  it('does not anchor an unpaid invoice', async () => {
    const invoice = memoryStorage.createInvoice({
      sellerPublicKey: seller,
      amount: 10,
      assetCode: 'XLM',
      memo: 'INV-UNPAID',
    });
    await expect(
      invoiceMemoryService.anchorProof(invoice.id, '00'.repeat(32), anchorTxHash),
    ).rejects.toMatchObject({ code: AnchorErrorCode.INVOICE_NOT_PAID });
  });

  it('matches the canonical Rust regression vector byte for byte', () => {
    const invoice = memoryStorage.createInvoice({
      sellerPublicKey: 'SellerA-PubKey-1234567890123456789012345678901234',
      amount: 10,
      assetCode: 'XLM',
      memo: 'Invoice INV-001',
      id: '11111111-1111-1111-1111-111111111111',
    });
    const withPayment = memoryStorage.markAsPaid(invoice.id, txHash, 'PayerA-PubKey-123456789012345678901234567890123456', 12345)!;
    expect(computeCanonicalDigest(withPayment)).toBe(
      '45d16a23e4b9492ccd2d36951094398064db488e804d2e975f0222c4fdde8e31',
    );
  });
});
