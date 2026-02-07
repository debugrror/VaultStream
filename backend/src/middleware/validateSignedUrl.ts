import { Request, Response, NextFunction } from 'express';
import { SecurityService } from '@services/SecurityService';
import { ApiError } from '@utils/ApiError';
import { logger } from '@utils/logger';

/**
 * Extended request with validated signed URL payload
 */
export interface SignedUrlRequest extends Request {
  signedPayload?: {
    videoId: string;
    resource: string;
    userId?: string;
    expiresAt: number;
  };
}

/**
 * Middleware to validate signed URL tokens
 * Extracts token from query parameter and validates it
 */
export function validateSignedUrl(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const token = req.query.token as string;

    if (!token) {
      throw ApiError.unauthorized('Missing access token', 'MISSING_TOKEN');
    }

    // Validate and decode token
    const payload = SecurityService.validateSignedUrl(token);

    // Attach payload to request
    (req as SignedUrlRequest).signedPayload = payload;

    // Verify resource matches the requested path
    const requestedResource = extractResourceFromPath(req.path);
    if (payload.resource !== requestedResource) {
      logger.warn('Resource mismatch in signed URL', {
        expected: payload.resource,
        requested: requestedResource,
        videoId: payload.videoId,
      });
      throw ApiError.forbidden('Invalid resource', 'RESOURCE_MISMATCH');
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Extract resource name from request path
 * E.g., /api/stream/:videoId/master.m3u8 -> 'master.m3u8'
 * E.g., /api/stream/:videoId/720p_001.ts -> '720p_001.ts'
 */
function extractResourceFromPath(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || '';
}
