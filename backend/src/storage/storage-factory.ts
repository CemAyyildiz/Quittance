/**
 * Storage factory - Returns Postgres or memory storage based on DATABASE_URL
 */
import memoryStorage from './memory-storage';
import postgresStorage from './postgres-storage';
import { pool } from '../config/database';

let storageInstance: typeof memoryStorage | typeof postgresStorage | null = null;

/**
 * Get the appropriate storage implementation
 * - With DATABASE_URL set: use Postgres and fail hard if connection fails
 * - Without DATABASE_URL: use memory storage
 */
export async function getStorage() {
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
      return storageInstance;
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
    return storageInstance;
  }
}

/**
 * Reset storage instance (for testing)
 */
export function resetStorage() {
  storageInstance = null;
}
