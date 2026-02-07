/**
 * Custom API Error class for better error handling
 */
export class ApiError extends Error {
  public statusCode: number;
  public code?: string;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Factory methods for common errors
   */
  static badRequest(message: string = 'Bad Request', code?: string) {
    return new ApiError(message, 400, code);
  }

  static unauthorized(message: string = 'Unauthorized', code?: string) {
    return new ApiError(message, 401, code);
  }

  static forbidden(message: string = 'Forbidden', code?: string) {
    return new ApiError(message, 403, code);
  }

  static notFound(message: string = 'Not Found', code?: string) {
    return new ApiError(message, 404, code);
  }

  static conflict(message: string = 'Conflict', code?: string) {
    return new ApiError(message, 409, code);
  }

  static tooManyRequests(message: string = 'Too Many Requests', code?: string) {
    return new ApiError(message, 429, code);
  }

  static internal(message: string = 'Internal Server Error', code?: string) {
    return new ApiError(message, 500, code);
  }
}
