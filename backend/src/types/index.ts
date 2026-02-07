import { Request } from 'express';

/**
 * User payload from JWT
 */
export interface JwtPayload {
  userId: string;
  email: string;
  channelId: string;
}

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * Video visibility options
 */
export type VideoVisibility = 'public' | 'unlisted' | 'private';

/**
 * Video processing status
 */
export type VideoStatus = 'uploading' | 'processing' | 'ready' | 'failed';

/**
 * Storage file metadata
 */
export interface StorageFileMetadata {
  contentType?: string;
  size?: number;
  originalName?: string;
}

/**
 * Signed URL options
 */
export interface SignedUrlOptions {
  expiresIn: number; // seconds
  videoId: string;
  userId?: string;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
