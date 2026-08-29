/**
 * Query-string helpers for Stellar public key parameters
 *
 * Express query values can arrive as `string | string[] | ParsedQs |
 * ParsedQs[] | undefined`. These helpers narrow a raw query value down to a
 * validated Stellar public key using the existing guards in
 * `public-key-guard.ts`, so route handlers no longer need to hand-roll
 * truthiness checks on `req.query`.
 */

import { isValidPublicKey } from './public-key-guard';

/** Discriminated result of parsing a query public key. */
export type ParsedPublicKeyResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

/**
 * Parses and validates a raw query-string value as a Stellar public key.
 *
 * Returns a discriminated result rather than throwing, so callers can decide
 * how to respond (e.g. 400 with `error`) without wrapping every call in
 * try/catch.
 *
 * @example
 * const result = parseSellerPublicKeyQuery(req.query.sellerPublicKey);
 * if (!result.ok) return res.status(400).json({ error: result.error });
 * const sellerPublicKey = result.value;
 */
export function parseSellerPublicKeyQuery(
  raw: unknown,
  label: string = 'sellerPublicKey',
): ParsedPublicKeyResult {
  if (raw == null || raw === '') {
    return { ok: false, error: `${label} is required` };
  }

  if (typeof raw !== 'string') {
    return { ok: false, error: `${label} must be a single string value` };
  }

  if (!isValidPublicKey(raw)) {
    return { ok: false, error: `${label} must be a valid Stellar public key` };
  }

  return { ok: true, value: raw };
}
