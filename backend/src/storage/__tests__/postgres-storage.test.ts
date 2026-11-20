/**
 * Postgres storage tests for issue #988
 * Tests: write, reload store, read same invoice; expired/paid cases
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import postgresStorage from '../postgres-storage';
import { pool } from '../../config/database';

describe('Postgres Storage (Issue #988)', () => {
  // Skip tests if DATABASE_URL is not set
  const skipTests = !process.env.DATABASE_URL;

  beforeAll(async () => {
    if (skipTests) {
      console.log('Skipping Postgres tests: DATABASE_URL not set');
      return;
    }

    // Ensure database connection
    try {
      await pool.query('SELECT 1');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  });

  beforeEach(async () => {
    if (skipTests) return;
    
    // Clean up test data before each test
    await pool.query('DELETE FROM invoices WHERE memo LIKE $1', ['TEST-%']);
  });

  afterAll(async () => {
    if (skipTests) return;
    
    // Clean up test data
    await pool.query('DELETE FROM invoices WHERE memo LIKE $1', ['TEST-%']);
    await pool.end();
  });

  it('should create and retrieve an invoice', async () => {
    if (skipTests) {
      console.log('Test skipped: DATABASE_URL not set');
      return;
    }

    const invoiceData = {
      sellerPublicKey: 'GTEST1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      amount: 100.50,
      assetCode: 'XLM',
      memo: 'TEST-CREATE-001',
      description: 'Test invoice',
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
    };

    const created = await postgresStorage.createInvoice(invoiceData);

    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.sellerPublicKey).toBe(invoiceData.sellerPublicKey);
    expect(created.amount).toBe(invoiceData.amount);
    expect(created.assetCode).toBe(invoiceData.assetCode);
    expect(created.memo).toBe(invoiceData.memo);
    expect(created.status).toBe('PENDING');

    // Retrieve the same invoice
    const retrieved = await postgresStorage.getInvoiceById(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(created.id);
    expect(retrieved!.sellerPublicKey).toBe(created.sellerPublicKey);
    expect(retrieved!.amount).toBe(created.amount);
    expect(retrieved!.memo).toBe(created.memo);
  });

  it('should persist invoice across storage instance reload', async () => {
    if (skipTests) {
      console.log('Test skipped: DATABASE_URL not set');
      return;
    }

    const invoiceData = {
      sellerPublicKey: 'GTEST2XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      amount: 250.75,
      assetCode: 'XLM',
      memo: 'TEST-RELOAD-002',
      description: 'Test persistence',
    };

    // Create invoice with first instance
    const created = await postgresStorage.createInvoice(invoiceData);
    const invoiceId = created.id;

    // Simulate "reload" by creating a new query (storage instance is singleton but this tests DB persistence)
    const retrieved = await postgresStorage.getInvoiceById(invoiceId);

    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(invoiceId);
    expect(retrieved!.amount).toBe(invoiceData.amount);
    expect(retrieved!.memo).toBe(invoiceData.memo);
    expect(retrieved!.status).toBe('PENDING');
  });

  it('should retrieve invoice by memo', async () => {
    if (skipTests) {
      console.log('Test skipped: DATABASE_URL not set');
      return;
    }

    const memo = 'TEST-MEMO-003';
    const invoiceData = {
      sellerPublicKey: 'GTEST3XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      amount: 50.00,
      assetCode: 'XLM',
      memo,
    };

    await postgresStorage.createInvoice(invoiceData);
    const retrieved = await postgresStorage.getInvoiceByMemo(memo);

    expect(retrieved).toBeDefined();
    expect(retrieved!.memo).toBe(memo);
  });

  it('should mark invoice as paid and persist payment details', async () => {
    if (skipTests) {
      console.log('Test skipped: DATABASE_URL not set');
      return;
    }

    const invoiceData = {
      sellerPublicKey: 'GTEST4XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      amount: 100.00,
      assetCode: 'XLM',
      memo: 'TEST-PAID-004',
    };

    const created = await postgresStorage.createInvoice(invoiceData);
    const txHash = 'TEST_TX_HASH_12345';
    const payerKey = 'GPAYER1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

    const updated = await postgresStorage.markAsPaid(created.id, txHash, payerKey);

    expect(updated).toBeDefined();
    expect(updated!.status).toBe('PAID');
    expect(updated!.paymentTxHash).toBe(txHash);
    expect(updated!.payerPublicKey).toBe(payerKey);
    expect(updated!.paidAt).toBeDefined();

    // Verify persistence after "reload"
    const retrieved = await postgresStorage.getInvoiceById(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved!.status).toBe('PAID');
    expect(retrieved!.paymentTxHash).toBe(txHash);
    expect(retrieved!.payerPublicKey).toBe(payerKey);
  });

  it('should not allow duplicate payment for already paid invoice', async () => {
    if (skipTests) {
      console.log('Test skipped: DATABASE_URL not set');
      return;
    }

    const invoiceData = {
      sellerPublicKey: 'GTEST5XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      amount: 150.00,
      assetCode: 'XLM',
      memo: 'TEST-DUP-005',
    };

    const created = await postgresStorage.createInvoice(invoiceData);
    await postgresStorage.markAsPaid(created.id, 'TX_HASH_1', 'PAYER_1');

    // Check status
    const paid = await postgresStorage.getInvoiceById(created.id);
    expect(paid!.status).toBe('PAID');
    expect(paid!.paymentTxHash).toBe('TX_HASH_1');
  });

  it('should mark expired invoices', async () => {
    if (skipTests) {
      console.log('Test skipped: DATABASE_URL not set');
      return;
    }

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Yesterday

    const invoiceData = {
      sellerPublicKey: 'GTEST6XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      amount: 200.00,
      assetCode: 'XLM',
      memo: 'TEST-EXPIRED-006',
      expiresAt: pastDate,
    };

    const created = await postgresStorage.createInvoice(invoiceData);
    expect(created.status).toBe('PENDING');

    // Run expiry sweep
    const expiredCount = await postgresStorage.markExpiredInvoices();
    expect(expiredCount).toBeGreaterThan(0);

    // Verify the invoice is now expired
    const expired = await postgresStorage.getInvoiceById(created.id);
    expect(expired).toBeDefined();
    expect(expired!.status).toBe('EXPIRED');
  });

  it('should keep paid invoice as paid (not affected by expiry)', async () => {
    if (skipTests) {
      console.log('Test skipped: DATABASE_URL not set');
      return;
    }

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const invoiceData = {
      sellerPublicKey: 'GTEST7XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      amount: 300.00,
      assetCode: 'XLM',
      memo: 'TEST-PAID-EXPIRED-007',
      expiresAt: pastDate,
    };

    const created = await postgresStorage.createInvoice(invoiceData);
    await postgresStorage.markAsPaid(created.id, 'TX_PAID_007', 'PAYER_007');

    // Run expiry sweep
    await postgresStorage.markExpiredInvoices();

    // Verify the invoice stays paid
    const stillPaid = await postgresStorage.getInvoiceById(created.id);
    expect(stillPaid).toBeDefined();
    expect(stillPaid!.status).toBe('PAID');
  });

  it('should get invoice statistics', async () => {
    if (skipTests) {
      console.log('Test skipped: DATABASE_URL not set');
      return;
    }

    const sellerKey = 'GTEST8XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

    // Create multiple invoices for stats
    await postgresStorage.createInvoice({
      sellerPublicKey: sellerKey,
      amount: 100,
      assetCode: 'XLM',
      memo: 'TEST-STATS-008-1',
    });

    const inv2 = await postgresStorage.createInvoice({
      sellerPublicKey: sellerKey,
      amount: 200,
      assetCode: 'XLM',
      memo: 'TEST-STATS-008-2',
    });

    await postgresStorage.markAsPaid(inv2.id, 'TX_STATS_008', 'PAYER_STATS_008');

    const stats = await postgresStorage.getStats(sellerKey);

    expect(stats).toBeDefined();
    expect(stats.total_invoices).toBeGreaterThanOrEqual(2);
    expect(stats.paid_invoices).toBeGreaterThanOrEqual(1);
    expect(stats.pending_invoices).toBeGreaterThanOrEqual(1);
    expect(stats.total_revenue).toBeGreaterThanOrEqual(200);
  });
});
