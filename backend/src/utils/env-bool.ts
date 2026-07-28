const truthyValues = new Set(['true', '1', 'yes']);
const falsyValues = new Set(['false', '0', 'no']);

/**
 * Parses an environment variable as a boolean.
 *
 * Truthy: "true", "1", "yes" (case-insensitive)
 * Falsy:  "false", "0", "no" (case-insensitive)
 *
 * Returns `defaultValue` when the value is missing or unrecognised.
 */
export function parseEnvBool(
  value: string | undefined,
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
