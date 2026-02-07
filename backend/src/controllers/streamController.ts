import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { Video } from '@models/Video';
import { storageAdapter } from '@services/storage';
import { SecurityService } from '@services/SecurityService';
import { asyncHandler } from '@middleware/errorHandler';
import { ApiError } from '@utils/ApiError';
import { logger } from '@utils/logger';
import type { AuthenticatedRequest, ApiResponse } from '../types';
import type { SignedUrlRequest } from '../middleware/validateSignedUrl';

/**
 * Request access to a passphrase-protected video
 * POST /api/videos/:videoId/access
 */
export const requestVideoAccess = asyncHandler(
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { videoId } = req.params;
    const { passphrase } = req.body;

    // Find video (include passphraseHash)
    const video = await Video.findOne({ videoId }).select('+passphraseHash');

    if (!video) {
      throw ApiError.notFound('Video not found', 'VIDEO_NOT_FOUND');
    }

    // Check video status
    if (video.status !== 'ready') {
      throw ApiError.badRequest(
        `Video is not ready. Current status: ${video.status}`,
        'VIDEO_NOT_READY'
      );
    }

    // Check access permissions based on visibility
    if (video.visibility === 'private') {
      // Private: only owner can access
      if (!authReq.user || authReq.user.userId !== video.userId) {
        throw ApiError.forbidden('Access denied', 'ACCESS_DENIED');
      }
    }

    // Verify passphrase if required
    if (video.passphraseHash) {
      if (!passphrase) {
        throw ApiError.unauthorized('Passphrase required', 'PASSPHRASE_REQUIRED');
      }

      const isValid = await SecurityService.verifyPassphrase(
        passphrase,
        video.passphraseHash
      );

      if (!isValid) {
        throw ApiError.unauthorized('Invalid passphrase', 'INVALID_PASSPHRASE');
      }

      logger.info('Passphrase verified for video access', {
        videoId,
        userId: authReq.user?.userId || 'anonymous',
      });
    }

    // Generate signed URL for master playlist
    const masterToken = SecurityService.generateSignedUrl(
      video.videoId,
      'master.m3u8',
      authReq.user?.userId
    );

    const response: ApiResponse = {
      success: true,
      data: {
        videoId: video.videoId,
        title: video.title,
        description: video.description,
        duration: video.duration,
        resolution: video.resolution,
        thumbnailPath: video.thumbnailPath,
        streamUrl: `/api/stream/${video.videoId}/master.m3u8?token=${masterToken}`,
        tokenExpiresIn: '1 hour',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  }
);

/**
 * Serve HLS master playlist
 * GET /api/stream/:videoId/master.m3u8?token=...
 */
export const serveMasterPlaylist = asyncHandler(
  async (req: Request, res: Response) => {
    const signedReq = req as SignedUrlRequest;
    const { videoId } = req.params;

    // Validate that signed payload matches
    if (signedReq.signedPayload?.videoId !== videoId) {
      throw ApiError.forbidden('Invalid video ID', 'INVALID_VIDEO_ID');
    }

    const video = await Video.findOne({ videoId });

    if (!video || video.status !== 'ready') {
      throw ApiError.notFound('Video not available', 'VIDEO_NOT_AVAILABLE');
    }

    // Read master playlist
    const playlistPath = video.masterPlaylistPath;
    if (!playlistPath) {
      throw ApiError.internal('Master playlist not found');
    }

    const playlistBuffer = await storageAdapter.download(playlistPath);
    let playlistContent = playlistBuffer.toString('utf-8');

    // Rewrite playlist URLs to include signed tokens
    playlistContent = rewritePlaylistUrls(
      playlistContent,
      videoId,
      signedReq.signedPayload?.userId
    );

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(playlistContent);

    logger.debug('Served master playlist', { videoId });
  }
);

/**
 * Serve HLS variant playlist (e.g., 720p.m3u8)
 * GET /api/stream/:videoId/:playlist?token=...
 */
export const serveVariantPlaylist = asyncHandler(
  async (req: Request, res: Response) => {
    const signedReq = req as SignedUrlRequest;
    const { videoId, playlist } = req.params;

    // Validate signed payload
    if (signedReq.signedPayload?.videoId !== videoId) {
      throw ApiError.forbidden('Invalid video ID', 'INVALID_VIDEO_ID');
    }

    const video = await Video.findOne({ videoId });

    if (!video || video.status !== 'ready') {
      throw ApiError.notFound('Video not available', 'VIDEO_NOT_AVAILABLE');
    }

    // Validate playlist filename (prevent directory traversal)
    if (!isValidPlaylistName(playlist)) {
      throw ApiError.badRequest('Invalid playlist name', 'INVALID_PLAYLIST');
    }

    // Read variant playlist
    const playlistPath = path.join(video.hlsPath, playlist);
    const playlistBuffer = await storageAdapter.download(playlistPath);
    let playlistContent = playlistBuffer.toString('utf-8');

    // Rewrite segment URLs to include signed tokens
    playlistContent = rewriteSegmentUrls(
      playlistContent,
      videoId,
      signedReq.signedPayload?.userId
    );

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(playlistContent);

    logger.debug('Served variant playlist', { videoId, playlist });
  }
);

/**
 * Serve HLS segment (.ts file)
 * GET /api/stream/:videoId/:segment?token=...
 */
export const serveSegment = asyncHandler(async (req: Request, res: Response) => {
  const signedReq = req as SignedUrlRequest;
  const { videoId, playlist: segment } = req.params;

  // Validate signed payload
  if (signedReq.signedPayload?.videoId !== videoId) {
    throw ApiError.forbidden('Invalid video ID', 'INVALID_VIDEO_ID');
  }

  const video = await Video.findOne({ videoId });

  if (!video || video.status !== 'ready') {
    throw ApiError.notFound('Video not available', 'VIDEO_NOT_AVAILABLE');
  }

  // Validate segment filename (prevent directory traversal)
  if (!isValidSegmentName(segment)) {
    throw ApiError.badRequest('Invalid segment name', 'INVALID_SEGMENT');
  }

  // Get segment path
  const segmentPath = path.join(video.hlsPath, segment);

  // Use streaming instead of buffering for memory efficiency
  const stream = await storageAdapter.downloadStream(segmentPath);

  // Set headers before piping
  res.setHeader('Content-Type', 'video/MP2T');
  res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache segments for 1 year

  // Handle stream errors
  stream.on('error', (err) => {
    logger.error('Stream error while serving segment', { videoId, segment, error: err.message });
    // Only send error if headers not already sent
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: { message: 'Failed to stream segment' } });
    }
    res.end();
  });

  // Pipe stream directly to response (no buffering)
  stream.pipe(res);

  logger.debug('Streaming segment', { videoId, segment });
});

/**
 * Rewrite playlist URLs to include signed tokens
 */
function rewritePlaylistUrls(
  content: string,
  videoId: string,
  userId?: string
): string {
  const lines = content.split('\n');
  const rewritten: string[] = [];

  for (const line of lines) {
    if (line.endsWith('.m3u8')) {
      // Generate signed token for variant playlist
      const token = SecurityService.generateSignedUrl(videoId, line, userId);
      rewritten.push(`${line}?token=${token}`);
    } else {
      rewritten.push(line);
    }
  }

  return rewritten.join('\n');
}

/**
 * Rewrite segment URLs to include signed tokens
 */
function rewriteSegmentUrls(
  content: string,
  videoId: string,
  userId?: string
): string {
  const lines = content.split('\n');
  const rewritten: string[] = [];

  for (const line of lines) {
    if (line.endsWith('.ts')) {
      // Generate signed token for segment
      const token = SecurityService.generateSignedUrl(videoId, line, userId);
      rewritten.push(`${line}?token=${token}`);
    } else {
      rewritten.push(line);
    }
  }

  return rewritten.join('\n');
}

/**
 * Validate playlist filename
 * Only allow alphanumeric, dash, underscore, and .m3u8 extension
 */
function isValidPlaylistName(filename: string): boolean {
  return /^[a-zA-Z0-9_-]+\.m3u8$/.test(filename);
}

/**
 * Validate segment filename
 * Only allow alphanumeric, dash, underscore, and .ts extension
 */
function isValidSegmentName(filename: string): boolean {
  return /^[a-zA-Z0-9_-]+\.ts$/.test(filename);
}
