import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler and forwards any rejected promise to Express's
 * `next(err)`, so that errors are handled by the centralized error middleware
 * instead of crashing the process or requiring a manual try/catch in every
 * async handler.
 *
 * Usage:
 * ```ts
 * router.get('/invoices', asyncHandler(async (req, res) => {
 *   const invoices = await invoiceService.list(req.query);
 *   res.json(invoices);
 * }));
 * ```
 *
 * A handler that resolves normally behaves exactly as if it were written
 * without the wrapper: it calls `next()` with no arguments, and the response
 * lifecycle is unchanged.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}