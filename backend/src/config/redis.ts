/**
 * Redis client configuration.
 *
 * IMPORTANT: Redis is reserved for post-MVP work (e.g. Bull queues / job
 * persistence on the full Postgres server) and is NOT wired into
 * `server-mvp.ts`. The MVP backend runs fully in memory and never creates a
 * real Redis connection, so this module is currently an unused stub that
 * only fires if something imports it directly.
 */
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

export default redis;

