import { describe, it, expect } from 'vitest';
import { buildProofPdfFilename } from '../export';

describe('buildProofPdfFilename', () => {
  const fixture = {
    id: 'inv-fixture-abc-001',
    invoiceNumber: 'INV-2026-0042',
    customerEmail: 'client@example.com',
    sellerPublicKey: 'GSELLERPUBLICKEYFIXTUREAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    payerPublicKey: 'GPAYERPUBLICKEYFIXTUREAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    paidAt: '2026-01-15T10:30:00.000Z',
    status: 'PAID',
  };

  it('builds filename from invoice number and UTC paid date', () => {
    expect(buildProofPdfFilename(fixture)).toBe(
      'invoice-proof-INV-2026-0042-2026-01-15.pdf'
    );
  });

  it('does not include customer email in the filename', () => {
    const name = buildProofPdfFilename(fixture);
    expect(name).not.toContain(fixture.customerEmail);
    expect(name).not.toContain('@');
  });

  it('does not include a full public key in the filename', () => {
    const name = buildProofPdfFilename(fixture);
    expect(name).not.toContain(fixture.sellerPublicKey);
    expect(name).not.toContain(fixture.payerPublicKey);
  });

  it('falls back to invoice id when invoice number is missing', () => {
    const name = buildProofPdfFilename({
      ...fixture,
      invoiceNumber: undefined,
    });
    expect(name).toBe('invoice-proof-inv-fixture-abc-001-2026-01-15.pdf');
    expect(name).not.toContain(fixture.customerEmail);
    expect(name).not.toContain('@');
  });

  it('falls back to invoice id for blank invoice number, not email', () => {
    const name = buildProofPdfFilename({
      ...fixture,
      invoiceNumber: '   ',
    });
    expect(name).toContain(fixture.id);
    expect(name).not.toContain(fixture.customerEmail);
  });
});
