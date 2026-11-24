import { createHash } from 'crypto';
import { describe, it, expect } from 'vitest';
import {
  buildProofCanonicalString,
  computeProofDigest,
  toInvoiceDTO,
  type ProofDigestFields,
} from '../invoice-dto';

const FIXTURE: ProofDigestFields = {
  network: 'TESTNET',
  invoiceId: 'inv-fixture-001',
  amount: 25.5,
  assetCode: 'XLM',
  assetIssuer: '',
  memo: 'MEMO-001',
  sellerPublicKey: 'GSELLERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  payerPublicKey: 'GPAYERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  paymentTxHash:
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
};

/** Locked vector: SHA-256 of the fixture canonical string. */
const FIXTURE_DIGEST =
  '7558a488f15bdc61e6bab73d70aa8fa785ddb794d7001a424a72858ae5551dd0';

/** Locked vector after changing only the payer public key. */
const CHANGED_PAYER_DIGEST =
  'fe9d774456013ca7d6603d2589a0e7bf698fc89fad69d3a1e48e90e18bc58eb7';

describe('proof digest', () => {
  it('locks the digest for the fixture canonical string', () => {
    const canonical = buildProofCanonicalString(FIXTURE);
    expect(canonical).toBe(
      [
        'TESTNET',
        'inv-fixture-001',
        '25.5',
        'XLM',
        '',
        'MEMO-001',
        'GSELLERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'GPAYERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      ].join('\n'),
    );

    const digest = computeProofDigest(FIXTURE);
    expect(digest).toBe(FIXTURE_DIGEST);
    expect(
      createHash('sha256').update(canonical, 'utf8').digest('hex'),
    ).toBe(FIXTURE_DIGEST);
  });

  it('locks a different digest when only the payer changes', () => {
    const changed: ProofDigestFields = {
      ...FIXTURE,
      payerPublicKey: 'GOTHERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    };
    expect(computeProofDigest(changed)).toBe(CHANGED_PAYER_DIGEST);
    expect(computeProofDigest(changed)).not.toBe(FIXTURE_DIGEST);
  });

  it('produces a different digest when only the transaction hash changes', () => {
    const changed: ProofDigestFields = {
      ...FIXTURE,
      paymentTxHash:
        'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    };
    expect(computeProofDigest(changed)).not.toBe(FIXTURE_DIGEST);
  });

  it('is stable for identical inputs', () => {
    expect(computeProofDigest(FIXTURE)).toBe(computeProofDigest({ ...FIXTURE }));
  });

  it('uses an empty issuer string for XLM, never the word null', () => {
    const withEmpty = buildProofCanonicalString(FIXTURE);
    expect(withEmpty.split('\n')[4]).toBe('');
    expect(withEmpty).not.toContain('null');

    const fromMissing = buildProofCanonicalString({
      ...FIXTURE,
      assetIssuer: '',
    });
    expect(fromMissing).toBe(withEmpty);
  });
});

describe('toInvoiceDTO proof fields', () => {
  function makePaid(overrides: Record<string, unknown> = {}) {
    return {
      id: FIXTURE.invoiceId,
      sellerPublicKey: FIXTURE.sellerPublicKey,
      amount: FIXTURE.amount as number,
      assetCode: FIXTURE.assetCode,
      assetIssuer: undefined,
      memo: FIXTURE.memo,
      status: 'PAID' as const,
      paymentTxHash: FIXTURE.paymentTxHash,
      payerPublicKey: FIXTURE.payerPublicKey,
      createdAt: new Date('2026-07-28T10:00:00Z'),
      paidAt: new Date('2026-07-28T11:00:00Z'),
      expiresAt: new Date('2026-08-04T10:00:00Z'),
      ...overrides,
    };
  }

  it('includes proofDigest and proofCanonical when the invoice is paid', () => {
    const dto = toInvoiceDTO(makePaid(), { network: 'TESTNET' });
    expect(dto.proofDigest).toBe(FIXTURE_DIGEST);
    expect(dto.proofCanonical).toBe(buildProofCanonicalString(FIXTURE));
  });

  it('omits proof digest fields on unpaid invoices', () => {
    const dto = toInvoiceDTO(
      makePaid({
        status: 'PENDING',
        paymentTxHash: undefined,
        payerPublicKey: undefined,
        paidAt: undefined,
      }),
      { network: 'TESTNET' },
    );
    expect(dto.proofDigest).toBeUndefined();
    expect(dto.proofCanonical).toBeUndefined();
  });
});
