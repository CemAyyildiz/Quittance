'use client';

import { useEffect, useState } from 'react';
import { getTimeRemaining } from './utils';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Live countdown label for an expiry timestamp.
 * Ticks every second under 1 hour remaining, every minute otherwise,
 * and stops once expired. Pass null/undefined to disable.
 */
export function useCountdown(expiresAt: string | Date | null | undefined): string {
  const [label, setLabel] = useState(() => (expiresAt ? getTimeRemaining(expiresAt) : ''));

  useEffect(() => {
    if (!expiresAt) {
      setLabel('');
      return;
    }

    const expiry = typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt.getTime();
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      setLabel(getTimeRemaining(expiresAt));
      const remaining = expiry - Date.now();
      if (remaining <= 0) return;
      timer = setTimeout(tick, remaining < HOUR_MS ? 1000 : 60 * 1000);
    };

    tick();
    return () => clearTimeout(timer);
  }, [expiresAt]);

  return label;
}

export default useCountdown;
