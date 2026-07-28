import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import memoryStorage from '../src/storage/memory-storage';

const VALID_SELLER = 'G' + 'A'.repeat(55);
const OTHER_SELLER = 'G' + 'B'.repeat(55);

describe('MemoryStorage smoke tests', () => {
  beforeEach(() => {
    memoryStorage.clear();
  });

  afterEach(() => {
    memoryStorage.clear();
  });

  describe('create', () => {
    it('creates an invoice and returns it with an id', () => {
      const invoice = memoryStorage.createInvoice({
        sellerPublicKey: VALID_SELLER,
        amount: 100,
        assetCode: 'XLM',
        memo: 'INV-001',
      });

      expect(invoice).toBeDefined();
      expect(invoice.id).toBeTruthy();
      expect(invoice.sellerPublicKey).toBe(VALID_SELLER);
      expect(invoice.amount).toBe(100);
      expect(invoice.assetCode).toBe('XLM');
      expect(invoice.memo).toBe('INV-001');
      expect(invoice.status).toBe('PENDING');
      expect(invoice.createdAt).toBeInstanceOf(Date);
    });

    it('assigns a custom id when provided', () => {
      const customId = 'custom-invoice-id';
      const invoice = memoryStorage.createInvoice({
        id: customId,
        sellerPublicKey: VALID_SELLER,
        amount: 200,
        assetCode: 'XLM',
        memo: 'INV-002',
      });

      expect(invoice.id).toBe(customId);
      expect(memoryStorage.getInvoiceById(customId)).toBe(invoice);
    });

    it('supports partial fields like description and customerName', () => {
      const invoice = memoryStorage.createInvoice({
        sellerPublicKey: VALID_SELLER,
        amount: 50,
        assetCode: 'XLM',
        memo: 'INV-003',
        description: 'Website redesign',
        customerName: 'Alice',
        customerEmail: 'alice@example.com',
      });

      expect(invoice.description).toBe('Website redesign');
      expect(invoice.customerName).toBe('Alice');
      expect(invoice.customerEmail).toBe('alice@example.com');
    });
  });

  describe('fetch by id', () => {
    it('returns an invoice when found by id', () => {
      const created = memoryStorage.createInvoice({
        sellerPublicKey: VALID_SELLER,
        amount: 100,
        assetCode: 'XLM',
        memo: 'INV-004',
      });

      const fetched = memoryStorage.getInvoiceById(created.id);

      expect(fetched).toBeDefined();
      expect(fetched!.id).toBe(created.id);
      expect(fetched!.amount).toBe(100);
    });

    it('returns undefined when no invoice matches the id', () => {
      const fetched = memoryStorage.getInvoiceById('nonexistent-id');

      expect(fetched).toBeUndefined();
    });

    it('can retrieve an invoice by the id returned from create', () => {
      const created = memoryStorage.createInvoice({
        sellerPublicKey: VALID_SELLER,
        amount: 250,
        assetCode: 'XLM',
        memo: 'INV-005',
      });

      const fetched = memoryStorage.getInvoiceById(created.id);

      expect(fetched).toEqual(created);
    });
  });

  describe('seller-scoped list', () => {
    it('returns only invoices for the requested seller', () => {
      memoryStorage.createInvoice({
        sellerPublicKey: VALID_SELLER,
        amount: 100,
        assetCode: 'XLM',
        memo: 'INV-006',
      });
      memoryStorage.createInvoice({
        sellerPublicKey: VALID_SELLER,
        amount: 200,
        assetCode: 'XLM',
        memo: 'INV-007',
      });
      memoryStorage.createInvoice({
        sellerPublicKey: OTHER_SELLER,
        amount: 300,
        assetCode: 'XLM',
        memo: 'INV-008',
      });

      const allInvoices = memoryStorage.getAllInvoices();
      const sellerInvoices = allInvoices.filter(
        (inv) => inv.sellerPublicKey === VALID_SELLER,
      );

      expect(allInvoices.length).toBe(3);
      expect(sellerInvoices.length).toBe(2);
      expect(sellerInvoices.every((inv) => inv.sellerPublicKey === VALID_SELLER)).toBe(true);
    });

    it('returns an empty array when no invoices exist for the seller', () => {
      memoryStorage.createInvoice({
        sellerPublicKey: OTHER_SELLER,
        amount: 100,
        assetCode: 'XLM',
        memo: 'INV-009',
      });

      const sellerInvoices = memoryStorage.getAllInvoices().filter(
        (inv) => inv.sellerPublicKey === VALID_SELLER,
      );

      expect(sellerInvoices).toEqual([]);
    });

    it('returns seller-scoped list sorted newest first', () => {
      const earlier = memoryStorage.createInvoice({
        sellerPublicKey: VALID_SELLER,
        amount: 100,
        assetCode: 'XLM',
        memo: 'INV-010',
      });
      const later = memoryStorage.createInvoice({
        sellerPublicKey: VALID_SELLER,
        amount: 200,
        assetCode: 'XLM',
        memo: 'INV-011',
      });

      const sellerInvoices = memoryStorage.getAllInvoices().filter(
        (inv) => inv.sellerPublicKey === VALID_SELLER,
      );

      expect(sellerInvoices.map((inv) => inv.id)).toContain(earlier.id);
      expect(sellerInvoices.map((inv) => inv.id)).toContain(later.id);
    });
  });
});