/**
 * Storage factory tests for issue #988
 * Tests: DATABASE_URL set but DB refused must fail hard
 */
import { describe, it, expect, afterEach } from 'vitest';
import { getStorage, resetStorage } from '../storage-factory';

describe('Storage Factory (Issue #988)', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    // Restore original DATABASE_URL
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
    resetStorage();
  });

  it('should use memory storage when DATABASE_URL is not set', async () => {
    delete process.env.DATABASE_URL;
    resetStorage();

    const storage = await getStorage();
    
    expect(storage).toBeDefined();
    // Memory storage has synchronous methods
    expect(typeof storage.createInvoice).toBe('function');
  });

  it('should use Postgres storage when DATABASE_URL is set and database is available', async () => {
    if (!originalDatabaseUrl) {
      console.log('Test skipped: DATABASE_URL not set in environment');
      return;
    }

    process.env.DATABASE_URL = originalDatabaseUrl;
    resetStorage();

    const storage = await getStorage();
    
    expect(storage).toBeDefined();
    expect(typeof storage.createInvoice).toBe('function');
  });

  it('should fail hard when DATABASE_URL is set but database is unavailable', async () => {
    // Set an invalid DATABASE_URL
    process.env.DATABASE_URL = 'postgresql://invalid:invalid@localhost:54321/nonexistent';
    resetStorage();

    await expect(getStorage()).rejects.toThrow(/DATABASE_URL is set but database connection failed/);
  });

  it('should not silently fall back to memory when DATABASE_URL is set but DB fails', async () => {
    // Set an invalid DATABASE_URL
    process.env.DATABASE_URL = 'postgresql://baduser:badpass@nonexistent.host:5432/baddb';
    resetStorage();

    // Should throw an error, not return memory storage
    await expect(getStorage()).rejects.toThrow();
  });
});
