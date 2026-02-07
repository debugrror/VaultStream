import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from '@utils/ApiError';

/**
 * Validation middleware
 * Checks express-validator results and throws error if validation fails
 */
export function validate(req: Request, _res: Response, next: NextFunction): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => {
      if ('msg' in err) {
        return err.msg;
      }
      return 'Validation error';
    });

    throw ApiError.badRequest(
      `Validation failed: ${errorMessages.join(', ')}`,
      'VALIDATION_ERROR'
    );
  }

  next();
}
