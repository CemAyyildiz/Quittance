/**
 * Idempotency-Key support for invoice create (MVP, in-memory).
 *
 * A key is scoped to the seller that sent it: the same seller with the same
 * key gets the original invoice back, while another seller using the same key
 * is treated as an unrelated request. Only successful creates are recorded, so
 * a request that failed (for example with a 400) can be retried with the same
 * key and still creates exactly once. Concurrent requests with the same scope
 * share one in-flight create instead of racing to write two invoices.
 */

export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';
export const IDEMPOTENCY_KEY_MAX_LENGTH = 128;

/** How long a completed key is remembered (default: 24 hours). */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export type IdempotencyKeyParseResult =
  | { ok: true; key?: string }
  | { ok: false; error: string };

/**
 * Validates the raw header value. A missing header is allowed (no key);
 * an empty key or one longer than 128 characters is rejected.
 */
export function parseIdempotencyKey(raw: unknown): IdempotencyKeyParseResult {
  if (raw === undefined) {
    return { ok: true };
  }

  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return { ok: false, error: `${IDEMPOTENCY_KEY_HEADER} must be a non-empty string` };
  }

  if (raw.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
    return {
      ok: false,
      error: `${IDEMPOTENCY_KEY_HEADER} must be at most ${IDEMPOTENCY_KEY_MAX_LENGTH} characters`,
    };
  }

  return { ok: true, key: raw };
}

interface CompletedEntry {
  invoiceId: string;
  expiresAt: number;
}

const completed = new Map<string, CompletedEntry>();
const inFlight = new Map<string, Promise<{ id: string }>>();

function scopeOf(sellerPublicKey: string, key: string): string {
  // Stellar public keys are base32 and never contain '|'.
  return `${sellerPublicKey}|${key}`;
}

function sweepExpired(now: number): void {
  for (const [scope, entry] of completed.entries()) {
    if (entry.expiresAt <= now) {
      completed.delete(scope);
    }
  }
}

/** Clears every remembered key (for tests). */
export function clearIdempotencyStore(): void {
  completed.clear();
  inFlight.clear();
}

/**
 * Runs `create` at most once per (seller, key). A replay resolves the stored
 * invoice through `lookup`; if it no longer exists the key is forgotten and a
 * new invoice is created.
 */
export async function createOnce<T extends { id: string }>(
  sellerPublicKey: string,
  key: string,
  lookup: (invoiceId: string) => Promise<T | null | undefined>,
  create: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<{ invoice: T; replayed: boolean }> {
  const scope = scopeOf(sellerPublicKey, key);
  const now = Date.now();
  sweepExpired(now);

  const done = completed.get(scope);
  if (done) {
    const existing = await lookup(done.invoiceId);
    if (existing) {
      return { invoice: existing, replayed: true };
    }
    completed.delete(scope);
  }

  const pending = inFlight.get(scope);
  if (pending) {
    try {
      return { invoice: (await pending) as T, replayed: true };
    } catch {
      // The first attempt failed and recorded nothing; start over so exactly
      // one of the waiting retries performs the create.
      return createOnce(sellerPublicKey, key, lookup, create, ttlMs);
    }
  }

  const attempt = create();
  inFlight.set(scope, attempt);
  try {
    const invoice = await attempt;
    completed.set(scope, { invoiceId: invoice.id, expiresAt: Date.now() + ttlMs });
    return { invoice, replayed: false };
  } finally {
    inFlight.delete(scope);
  }
}
