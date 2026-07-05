import type { RequestHandler } from 'express';

// Express 4 does not forward rejected promises from async handlers to the
// error middleware, so wrap each async route to pipe failures into next().
export const asyncRoute =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
