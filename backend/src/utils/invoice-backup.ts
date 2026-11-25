import { toInvoiceDTO } from './invoice-dto';

type StoredInvoice = Parameters<typeof toInvoiceDTO>[0] & { lineItems?: unknown[] };

/** The import contract is a JSON array of invoice records, never a CSV wrapper. */
export function createInvoiceBackup(invoices: StoredInvoice[], sellerPublicKey: string, includeCustomerEmail = false) {
  return invoices.filter((invoice) => invoice.sellerPublicKey === sellerPublicKey).map((invoice) => {
    const record = toInvoiceDTO(invoice, { includePrivateContacts: true });
    const {
      customerEmail,
      sellerEmail: _sellerEmail,
      proofDigest: _digest,
      proofCanonical: _canonical,
      ...fields
    } = record;
    return {
      ...fields,
      ...(includeCustomerEmail && customerEmail ? { customerEmail } : {}),
      ...(invoice.lineItems ? { lineItems: structuredClone(invoice.lineItems) } : {}),
    };
  });
}
