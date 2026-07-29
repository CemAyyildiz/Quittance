import { Router, Request, Response } from 'express';

const router = Router();

// Track server start time for uptime calculation
const startTime: Date = new Date();

/**
 * GET /health/detail
 *
 * Returns detailed health information about the Quittance API server:
 * version, network environment, uptime, and available services.
 *
 * This endpoint is purely informational and does not perform database
 * health checks (out of scope — see issue #80).
 */
router.get('/health/detail', (_req: Request, res: Response) => {
  const now: Date = new Date();
  const uptimeSeconds: number = Math.floor((now.getTime() - startTime.getTime()) / 1000);

  const network: string = process.env.STELLAR_NETWORK || 'TESTNET';
  const nodeEnv: string = process.env.NODE_ENV || 'development';

  res.json({
    status: 'ok',
    service: 'Quittance API',
    version: '1.0.0',
    network,
    environment: nodeEnv,
    uptime: {
      seconds: uptimeSeconds,
      human: formatUptime(uptimeSeconds),
    },
    timestamp: now.toISOString(),
    endpoints: {
      health: '/api/health',
      detail: '/api/health/detail',
    },
  });
});

/**
 * Format a duration in seconds into a human-readable string.
 *
 * Examples:
 * - 45 → "45s"
 * - 130 → "2m 10s"
 * - 3700 → "1h 1m 40s"
 */
function formatUptime(totalSeconds: number): string {
  const hours: number = Math.floor(totalSeconds / 3600);
  const minutes: number = Math.floor((totalSeconds % 3600) / 60);
  const seconds: number = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

export default router;
