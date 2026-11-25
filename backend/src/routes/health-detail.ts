import { Router, Request, Response } from 'express';
import { formatUptime } from '../utils/format-uptime';
import stellarService from '../services/stellar.service';

const router = Router();

// Track server start time for uptime calculation
const startTime: Date = new Date();

/**
 * GET /health/detail
 *
 * Returns detailed health information about the Quittance API server and
 * probes Horizon with a short timeout. On Horizon failure returns 503 while
 * keeping the process up. Does not include secrets.
 *
 * Persistence health checks remain out of scope (see issue #80).
 */
router.get('/health/detail', async (_req: Request, res: Response) => {
  const now: Date = new Date();
  const uptimeSeconds: number = Math.floor((now.getTime() - startTime.getTime()) / 1000);

  const configuredNetwork = process.env.STELLAR_NETWORK?.trim() || 'TESTNET';
  const normalizedNetwork = configuredNetwork.toUpperCase();
  const networkIsValid = normalizedNetwork === 'TESTNET' || normalizedNetwork === 'PUBLIC';
  const horizonUrlConfigured =
    Boolean(process.env.STELLAR_HORIZON_URL?.trim()) || networkIsValid;
  const nodeEnv: string = process.env.NODE_ENV || 'development';

  const base = {
    service: 'Quittance API',
    version: '1.0.0',
    network: networkIsValid ? normalizedNetwork : 'INVALID',
    networkStatus: networkIsValid ? 'configured' : 'invalid',
    horizonStatus: horizonUrlConfigured ? 'configured' : 'not configured',
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
  };

  if (!networkIsValid || !horizonUrlConfigured) {
    res.status(503).json({
      status: 'error',
      message: !networkIsValid
        ? 'Invalid Stellar network configuration'
        : 'Horizon URL not configured',
      ...base,
    });
    return;
  }

  const horizon = await stellarService.checkHorizonHealth();

  if (!horizon.reachable) {
    res.status(503).json({
      status: 'error',
      message: 'Horizon unreachable',
      ...base,
    });
    return;
  }

  res.json({
    status: 'ok',
    ...base,
    latestLedger: horizon.latestLedger,
  });
});

export default router;
