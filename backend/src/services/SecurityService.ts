import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { config } from '@config/env';
import { logger } from '@utils/logger';
import { ApiError } from '@utils/ApiError';

/**
 * Signed URL payload
 */
export interface SignedUrlPayload {
  videoId: string;
  userId?: string; // Optional for public videos
  resource: string; // e.g., 'master.m3u8', '720p.m3u8', '720p_001.ts'
  expiresAt: number; // Unix timestamp
}

/**
 * Security service for signed URLs and passphrase protection
 */
export class SecurityService {
  /**
   * Generate a signed URL for HLS resource access
   * @param videoId - Video identifier
   * @param resource - Resource path (e.g., 'master.m3u8', '720p_001.ts')
   * @param userId - Optional user ID for private videos
   * @param expiresIn - Expiry duration in seconds (default from config)
   * @returns Signed token
   */
  static generateSignedUrl(
    videoId: string,
    resource: string,
    userId?: string,
    expiresIn?: number
  ): string {
    const expiry = expiresIn || config.security.signedUrlExpiry;
    const expiresAt = Math.floor(Date.now() / 1000) + expiry;

    const payload: SignedUrlPayload = {
      videoId,
      resource,
      expiresAt,
    };

    if (userId) {
      payload.userId = userId;
    }

    // Create signature
    const signature = this.createSignature(payload);

    // Encode payload and signature
    const token = this.encodeToken(payload, signature);

    logger.debug('Generated signed URL token', {
      videoId,
      resource,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    });

    return token;
  }

  /**
   * Validate a signed URL token
   * @param token - Signed token from query parameter
   * @returns Decoded and validated payload
   * @throws ApiError if token is invalid or expired
   */
  static validateSignedUrl(token: string): SignedUrlPayload {
    try {
      // Decode token
      const { payload, signature } = this.decodeToken(token);

      // Verify signature
      const expectedSignature = this.createSignature(payload);
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        throw ApiError.forbidden('Invalid signature', 'INVALID_SIGNATURE');
      }

      // Check expiry
      const now = Math.floor(Date.now() / 1000);
      if (payload.expiresAt < now) {
        throw ApiError.forbidden('Token expired', 'TOKEN_EXPIRED');
      }

      logger.debug('Validated signed URL token', {
        videoId: payload.videoId,
        resource: payload.resource,
      });

      return payload;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.warn('Invalid signed URL token', { error });
      throw ApiError.forbidden('Invalid token', 'INVALID_TOKEN');
    }
  }

  /**
   * Create HMAC-SHA256 signature for payload
   */
  private static createSignature(payload: SignedUrlPayload): string {
    const data = JSON.stringify({
      videoId: payload.videoId,
      resource: payload.resource,
      expiresAt: payload.expiresAt,
      userId: payload.userId || null,
    });

    const hmac = crypto.createHmac('sha256', config.security.hmacSecret);
    hmac.update(data);
    return hmac.digest('hex');
  }

  /**
   * Encode payload and signature into a token
   */
  private static encodeToken(payload: SignedUrlPayload, signature: string): string {
    const data = {
      p: payload,
      s: signature,
    };
    return Buffer.from(JSON.stringify(data)).toString('base64url');
  }

  /**
   * Decode token into payload and signature
   */
  private static decodeToken(token: string): {
    payload: SignedUrlPayload;
    signature: string;
  } {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const data = JSON.parse(decoded);

    if (!data.p || !data.s) {
      throw new Error('Invalid token structure');
    }

    return {
      payload: data.p,
      signature: data.s,
    };
  }

  /**
   * Hash a passphrase using bcrypt
   * @param passphrase - Plain text passphrase
   * @returns Bcrypt hash
   */
  static async hashPassphrase(passphrase: string): Promise<string> {
    if (!passphrase || passphrase.length < 4) {
      throw ApiError.badRequest(
        'Passphrase must be at least 4 characters',
        'WEAK_PASSPHRASE'
      );
    }

    const salt = await bcrypt.genSalt(config.security.bcryptSaltRounds);
    return bcrypt.hash(passphrase, salt);
  }

  /**
   * Verify a passphrase against its hash
   * @param passphrase - Plain text passphrase
   * @param hash - Bcrypt hash from database
   * @returns True if passphrase matches
   */
  static async verifyPassphrase(passphrase: string, hash: string): Promise<boolean> {
    return bcrypt.compare(passphrase, hash);
  }

  /**
   * Generate signed URLs for all HLS resources
   * @param videoId - Video identifier
   * @param hlsFiles - Array of HLS file names (e.g., ['master.m3u8', '720p.m3u8', ...])
   * @param userId - Optional user ID for private videos
   * @param expiresIn - Expiry duration in seconds
   * @returns Map of file names to signed tokens
   */
  static generateBulkSignedUrls(
    videoId: string,
    hlsFiles: string[],
    userId?: string,
    expiresIn?: number
  ): Map<string, string> {
    const tokens = new Map<string, string>();

    for (const file of hlsFiles) {
      const token = this.generateSignedUrl(videoId, file, userId, expiresIn);
      tokens.set(file, token);
    }

    return tokens;
  }
}
