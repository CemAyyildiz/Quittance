const truthyValues = new Set(['true', '1', 'yes']);
const falsyValues = new Set(['false', '0', 'no']);

/**
 * Safely parse a raw string from an environment variable into a boolean.
 *
 * Recognition rules (case-insensitive, surrounding whitespace ignored):
 *   truthy -> "true" | "1" | "yes"
 *   falsy  -> "false" | "0" | "no"
 *
 * Returns `defaultValue` (default `false`) when the input is missing, empty,
 * or not one of the recognised tokens. This avoids the well-known foot-gun of
 * coercing arbitrary strings via `Boolean(value)` or `value === 'true'` which
 * silently turn typos, `True` (capitalisation), or values like `2` into
 * unexpected truthiness / falsiness.
 *
 * @example
 *   parseEnvBool('true')          // => true
 *   parseEnvBool('YES')           // => true
 *   parseEnvBool('  1 ')          // => true
 *   parseEnvBool('false')         // => false
 *   parseEnvBool('no')            // => false
 *   parseEnvBool(undefined)       // => false
 *   parseEnvBool(undefined, true) // => true
 *   parseEnvBool('maybe')         // => false (default)
 *   parseEnvBool('maybe', true)   // => true  (default)
 */
export function parseEnvBool(
  value: string | undefined | null,
  defaultValue: boolean = false,
): boolean {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();

  if (truthyValues.has(normalized)) {
    return true;
  }

  if (falsyValues.has(normalized)) {
    return false;
  }

  return defaultValue;
}
