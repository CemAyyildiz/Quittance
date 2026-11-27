/**
 * Storage factory - Returns Postgres or memory storage based on DATABASE_URL
 */
import memoryStorage from './memory-storage';
import type { StatusEvent, StatusEventStatus } from './memory-storage';
import postgresStorage from './postgres-storage';
import { pool } from '../config/database';

export interface InvoiceStore {
  createInvoice(data: Record<string, unknown>): Promise<any> | any;
  getInvoiceById(id: string): Promise<any> | any;
  getInvoiceByMemo(memo: string): Promise<any> | any;
  getInvoiceByTxHash(txHash: string): Promise<any> | any;
  updateInvoice(id: string, updates: Record<string, unknown>): Promise<any> | any;
  markAsPaid(
    id: string,
    txHash: string,
    payerPublicKey: string,
    meta?: { ledger?: number; paidAt?: Date }
  ): Promise<any> | any;
  markAsRefunded(
    id: string,
    refundTxHash: string,
    meta?: { ledger?: number; refundedAt?: Date }
  ): Promise<any> | any;
  recordPayment(
    invoiceId: string,
    payment: {
      txHash: string;
      amount: string;
      payerPublicKey: string;
      ledger: number;
      paidAt: Date;
    },
    receivedAmount: string,
    paid: boolean,
  ): Promise<any> | any;
  getAllInvoices(filter?: { status?: string }): Promise<any[]> | any[];
  getStats(sellerPublicKey: string): Promise<any> | any;
  markExpiredInvoices(): Promise<number> | number;
  /**
   * Append one lifecycle event. Optional: a backend without an append-only
   * history table simply does not implement it.
   */
  appendStatusEvent?(
    invoiceId: string,
    status: StatusEventStatus,
    txHash?: string,
    at?: Date
  ): Promise<StatusEvent | undefined> | StatusEvent | undefined;
  /** All events for an invoice, oldest first. */
  getStatusHistory?(invoiceId: string): Promise<StatusEvent[]> | StatusEvent[];
}

let storageInstance: InvoiceStore | null = null;

/**
 * Get the appropriate storage implementation
 * - With DATABASE_URL set: use Postgres and fail hard if connection fails
 * - Without DATABASE_URL: use memory storage
 */
export async function getStorage(): Promise<InvoiceStore> {
  if (storageInstance) {
    return storageInstance;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // DATABASE_URL is set - must use Postgres and fail if unavailable
    try {
      // Test the connection
      await pool.query('SELECT 1');
      console.log('✅ Postgres connection established');
      storageInstance = postgresStorage;
      return postgresStorage;
    } catch (error: any) {
      console.error('❌ Failed to connect to Postgres:', error.message);
      console.error('DATABASE_URL is set but database is unavailable');
      throw new Error(
        `DATABASE_URL is set but database connection failed: ${error.message}`
      );
    }
  } else {
    // No DATABASE_URL - use memory storage
    console.log('💾 Using in-memory storage (DATABASE_URL not set)');
    storageInstance = memoryStorage;
    return memoryStorage;
  }
}

/**
 * Reset storage instance (for testing)
 */
export function resetStorage() {
  storageInstance = null;
}
