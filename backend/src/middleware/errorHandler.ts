import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@utils/ApiError';
import { logger } from '@utils/logger';
import type { ApiResponse } from '../types';


/**
 * Error handler middleware
 * Catches all errors and formats them into consistent API responses
 */
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Default to 500 if not an ApiError
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const code = err instanceof ApiError ? err.code : 'INTERNAL_ERROR';
  
  // Log error
  logger.error(`[${req.method}] ${req.path}`, {
    error: err.message,
    stack: err.stack,
    statusCode,
  });

  // Create response
  const response: ApiResponse = {
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      code,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  // Don't expose stack traces in production
  if (process.env['NODE_ENV'] === 'development') {
    (response.error as any).stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.path}`));
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
