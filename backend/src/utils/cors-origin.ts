/**
 * Parse a CORS origin value that may be a single URL or a comma-separated list.
 *
 * Reads from an environment variable (or any string) and returns a clean array
 * of origin strings suitable for the `cors` middleware `origin` option.
 *
 * Usage in an Express server:
 * ```
 * import cors from 'cors';
 * import { parseCorsOrigin } from './utils/cors-origin';
 *
 * app.use(cors({
 *   origin: parseCorsOrigin(process.env.FRONTEND_URL, 'http://localhost:3000'),
 *   credentials: true,
 * }));
 * ```
 *
 * @param raw - Raw string input (e.g. process.env.FRONTEND_URL). May be undefined.
 * @param fallback - Default origin(s) used when raw is empty.
 * @returns A non-empty array of origin strings.
 */
export const parseCorsOrigin = (raw: string | undefined, fallback = 'http://localhost:3000'): string[] => {
  const source = raw?.trim() || fallback;
  const origins = source
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return origins.length > 0 ? origins : [fallback];
};

export default { parseCorsOrigin };