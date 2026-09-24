/**
 * Stellar public key format guard
 *
 * Validates that a string is a properly formatted Stellar account public key.
 * Stellar public keys are 56-character base-32 encoded strings that begin
 * with the letter 'G' and use the alphabet A–Z plus digits 2–7.
 *
 * @see https://developers.stellar.org/docs/fundamentals-and-concepts/stellar-data-structures#account-identifiers
 */

/** Convenience re-export of the Zod schema from validation.ts */
export { stellarPublicKeySchema } from './validation';

// ── Constants ──────────────────────────────────────────────────────────────

/** Canonical length of a Stellar public key (56 characters). */
export const STELLAR_KEY_LENGTH = 56 as const;

/**
 * Regex matching a valid Stellar public key.
 * - Starts with 'G'
 * - Followed by exactly 55 characters from the base-32 alphabet (A-Z, 2-7)
 */
const STELLAR_KEY_REGEX = /^G[A-Z2-7]{55}$/;

// ── Guard functions ────────────────────────────────────────────────────────

/**
 * Returns `true` when `key` is a syntactically valid Stellar public key.
 *
 * This is a pure check that does not throw. Use `assertValidPublicKey` when
 * you want an error to be raised for invalid keys.
 *
 * @example
 * isValidPublicKey('GBOG5GL3Y7ITR3I6P4JH2SJZGYKA7HGZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3') // true
 * isValidPublicKey('')   // false
 * isValidPublicKey(null) // false
 * isValidPublicKey('SBOG5GL3Y7ITR3I6P4JH2SJZGYKA7HGZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3') // false (starts with S)
 */
export function isValidPublicKey(key: unknown): key is string {
  if (typeof key !== 'string' || key.length === 0) {
    return false;
  }
  return key.length === STELLAR_KEY_LENGTH && STELLAR_KEY_REGEX.test(key);
}

/**
 * Asserts that `key` is a syntactically valid Stellar public key.
 *
 * Throws a descriptive `Error` when validation fails. Accepts an optional
 * `label` that is interpolated into the error message so callers can
 * identify which field or parameter failed validation.
 *
 * @throws {Error} If the key is missing, not a string, or not a valid format.
 *
 * @example
 * assertValidPublicKey(sellerKey, 'sellerPublicKey')
 * assertValidPublicKey(payerKey) // uses default label "Public key"
 */
export function assertValidPublicKey(key: unknown, label: string = 'Public key'): asserts key is string {
  if (key == null || (typeof key !== 'string' && typeof key !== 'object')) {
    throw new Error(`${label} is required`);
  }

  if (typeof key !== 'string') {
    throw new Error(`${label} must be a string`);
  }

  if (key.length === 0) {
    throw new Error(`${label} must not be empty`);
  }

  if (key.length !== STELLAR_KEY_LENGTH) {
    throw new Error(
      `${label} must be exactly ${STELLAR_KEY_LENGTH} characters long (got ${key.length})`,
    );
  }

  if (!key.startsWith('G')) {
    throw new Error(`${label} must start with 'G'`);
  }

  if (!STELLAR_KEY_REGEX.test(key)) {
    throw new Error(
      `${label} contains invalid characters; expected base-32 alphabet (A-Z, 2-7)`,
    );
  }
}
