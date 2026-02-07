import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Video } from '@models/Video';
import { storageAdapter } from '@services/storage';
import { VideoProcessingService } from '@services/VideoProcessingService';
import { asyncHandler } from '@middleware/errorHandler';
import { ApiError } from '@utils/ApiError';
import { logger } from '@utils/logger';
import { config } from '@config/env';
import type { ApiResponse, AuthenticatedRequest } from '../types';

/**
 * Configure Multer for video uploads
 * Stream to temporary disk storage to support large files
 */
export const uploadMiddleware = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      // Ensure temp directory exists
      cb(null, config.storage.tempUploadPath);
    },
    filename: (_req, file, cb) => {
      // Use UUID for temp filename to avoid collisions
      const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
      cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: config.video.maxSizeMB * 1024 * 1024, // Convert MB to bytes
  },
  fileFilter: (_req, file, cb) => {
    const allowedFormats = config.video.allowedFormats;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);

    if (allowedFormats.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new ApiError(
          `Invalid file format. Allowed: ${allowedFormats.join(', ')}`,
          400,
          'INVALID_FILE_FORMAT'
        ) as any
      );
    }
  },
}).single('video');

/**
 * Upload video
 * POST /api/videos/upload
 */
export const uploadVideo = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    // Clean up temp file if auth fails
    if (req.file) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    throw ApiError.unauthorized('Authentication required');
  }

  // Multer middleware has already run and populated req.file (with path) and req.body
  if (!req.file) {
    throw ApiError.badRequest('No video file provided', 'NO_FILE');
  }

  const { title, description, visibility, passphrase } = req.body;
  const tempFilePath = req.file.path;

  // Validate required fields
  if (!title || title.trim().length === 0) {
    // Clean up temp file
    await fs.promises.unlink(tempFilePath).catch(() => {});
    throw ApiError.badRequest('Title is required', 'MISSING_TITLE');
  }

  const videoId = uuidv4();
  const userId = authReq.user.userId;
  const originalFilename = req.file.originalname;
  const fileExtension = path.extname(originalFilename);

  // Define storage paths
  const videoStoragePath = `videos/${userId}/${videoId}/original${fileExtension}`;
  const hlsPath = `videos/${userId}/${videoId}/hls`;

  try {
    // Hash passphrase if provided
    let passphraseHash: string | undefined;
    if (passphrase && passphrase.trim().length > 0) {
      const { SecurityService } = await import('@services/SecurityService');
      passphraseHash = await SecurityService.hashPassphrase(passphrase.trim());
      logger.info('Passphrase protection enabled for video', { videoId });
    }

    // Upload to storage
    if (config.storage.type === 'local') {
      // OPTIMIZATION: For local storage, just move the file to avoid double I/O.
      // This is much faster and uses 0 extra memory.
      const destPath = await storageAdapter.getPath(videoStoragePath);
      const destDir = path.dirname(destPath);
      
      await fs.promises.mkdir(destDir, { recursive: true });
      await fs.promises.rename(tempFilePath, destPath);
      
      logger.debug('Moved temp file to local storage', { temp: tempFilePath, dest: destPath });
    } else {
      // For cloud storage (S3/R2), stream the file from disk.
      // This prevents loading the 2GB+ file into RAM.
      const readStream = fs.createReadStream(tempFilePath);
      
      // storageAdapter.upload expects Buffer in the interface, but underlying implementations 
      // (like S3/fs.writeFile) support streams. We cast to any to bypass TS for now
      // while maintaining the interface contract for other callers.
      await storageAdapter.upload(readStream as any, videoStoragePath, {
        contentType: req.file.mimetype,
        size: req.file.size,
        originalName: originalFilename,
      });
      
      // Delete temp file after successful streaming upload
      await fs.promises.unlink(tempFilePath).catch(() => {});
    }

    logger.info('Original video uploaded', {
      videoId,
      userId,
      filename: originalFilename,
      size: req.file.size,
    });

    // Create video document
    const video = new Video({
      videoId,
      userId,
      title: title.trim(),
      description: description?.trim() || '',
      visibility: visibility || 'unlisted',
      passphraseHash,
      originalFilename,
      storagePath: videoStoragePath,
      hlsPath,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: 'uploading',
    });

    await video.save();

    // Start background processing (don't await)
    const inputPath = await storageAdapter.getPath(videoStoragePath);
    VideoProcessingService.processVideo(video, inputPath).catch((error) => {
      logger.error('Background video processing failed', {
        videoId,
        error: error instanceof Error ? error.message : error,
      });
    });

    // Return response immediately
    const response: ApiResponse = {
      success: true,
      data: {
        videoId: video.videoId,
        title: video.title,
        status: video.status,
        message: 'Video uploaded successfully. Processing started.',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.status(201).json(response);
  } catch (error) {
    // Cleanup temp file on error
    await fs.promises.unlink(tempFilePath).catch(() => {});

    logger.error('Video upload failed', {
      videoId,
      userId,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
});

/**
 * Get video by ID
 * GET /api/videos/:videoId
 */
export const getVideo = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { videoId } = req.params;

  const video = await Video.findOne({ videoId });

  if (!video) {
    throw ApiError.notFound('Video not found', 'VIDEO_NOT_FOUND');
  }

  // Check access permissions
  if (video.visibility === 'private') {
    if (!authReq.user || authReq.user.userId !== video.userId) {
      throw ApiError.forbidden('Access denied', 'ACCESS_DENIED');
    }
  }

  const response: ApiResponse = {
    success: true,
    data: {
      video: {
        videoId: video.videoId,
        title: video.title,
        description: video.description,
        visibility: video.visibility,
        status: video.status,
        duration: video.duration,
        resolution: video.resolution,
        thumbnailPath: video.thumbnailPath,
        views: video.views,
        createdAt: video.createdAt,
        userId: video.userId,
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * Get user's videos
 * GET /api/videos/my-videos
 */
export const getMyVideos = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  const videos = await Video.find({ userId: authReq.user.userId })
    .sort({ createdAt: -1 })
    .select('-__v');

  const response: ApiResponse = {
    success: true,
    data: {
      videos: videos.map((v) => ({
        videoId: v.videoId,
        title: v.title,
        description: v.description,
        visibility: v.visibility,
        status: v.status,
        duration: v.duration,
        resolution: v.resolution,
        thumbnailPath: v.thumbnailPath,
        views: v.views,
        createdAt: v.createdAt,
      })),
      total: videos.length,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * Update video metadata
 * PATCH /api/videos/:videoId
 */
export const updateVideo = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  const { videoId } = req.params;
  const { title, description, visibility } = req.body;

  const video = await Video.findOne({ videoId });

  if (!video) {
    throw ApiError.notFound('Video not found', 'VIDEO_NOT_FOUND');
  }

  // Check ownership
  if (video.userId !== authReq.user.userId) {
    throw ApiError.forbidden('Access denied', 'ACCESS_DENIED');
  }

  // Update fields
  if (title !== undefined) {
    video.title = title.trim();
  }
  if (description !== undefined) {
    video.description = description.trim();
  }
  if (visibility !== undefined) {
    if (!['public', 'unlisted', 'private'].includes(visibility)) {
      throw ApiError.badRequest('Invalid visibility value', 'INVALID_VISIBILITY');
    }
    video.visibility = visibility;
  }

  await video.save();

  const response: ApiResponse = {
    success: true,
    data: {
      video: {
        videoId: video.videoId,
        title: video.title,
        description: video.description,
        visibility: video.visibility,
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * Delete video
 * DELETE /api/videos/:videoId
 */
export const deleteVideo = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  const { videoId } = req.params;

  const video = await Video.findOne({ videoId });

  if (!video) {
    throw ApiError.notFound('Video not found', 'VIDEO_NOT_FOUND');
  }

  // Check ownership
  if (video.userId !== authReq.user.userId) {
    throw ApiError.forbidden('Access denied', 'ACCESS_DENIED');
  }

  // Delete files from storage
  await VideoProcessingService.deleteVideoFiles(video);

  // Delete database record
  await Video.deleteOne({ videoId });

  const response: ApiResponse = {
    success: true,
    data: {
      message: 'Video deleted successfully',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * Request video access
 * POST /api/videos/:videoId/access
 * Validates visibility + passphrase and returns a signed HLS stream URL
 */
export const requestVideoAccess = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { videoId } = req.params;
  const { passphrase } = req.body;

  const video = await Video.findOne({ videoId });

  if (!video) {
    throw ApiError.notFound('Video not found', 'VIDEO_NOT_FOUND');
  }

  // Check visibility permissions
  if (video.visibility === 'private') {
    // Private videos require owner authentication
    if (!authReq.user || authReq.user.userId !== video.userId) {
      throw ApiError.forbidden('Access denied', 'ACCESS_DENIED');
    }
  }

  // Check passphrase if video is protected
  if (video.passphraseHash) {
    if (!passphrase) {
      throw ApiError.forbidden('Passphrase required', 'PASSPHRASE_REQUIRED');
    }

    const { SecurityService } = await import('@services/SecurityService');
    const isValid = await SecurityService.verifyPassphrase(passphrase, video.passphraseHash);

    if (!isValid) {
      throw ApiError.forbidden('Invalid passphrase', 'INVALID_PASSPHRASE');
    }
  }

  // Check if video is ready for streaming
  if (video.status !== 'ready') {
    throw ApiError.badRequest(
      `Video is not ready. Current status: ${video.status}`,
      'VIDEO_NOT_READY'
    );
  }

  // Generate signed URL for HLS master playlist
  const { SecurityService } = await import('@services/SecurityService');
  const userId = authReq.user?.userId;
  const token = SecurityService.generateSignedUrl(videoId, 'master.m3u8', userId);

  // Build stream URL
  const streamUrl = `/api/stream/${videoId}/master.m3u8?token=${token}`;

  logger.info('Video access granted', {
    videoId,
    userId: userId || 'anonymous',
    visibility: video.visibility,
    hasPassphrase: !!video.passphraseHash,
  });

  const response: ApiResponse = {
    success: true,
    data: {
      videoId: video.videoId,
      title: video.title,
      description: video.description,
      visibility: video.visibility,
      views: video.views || 0,
      userId: video.userId,
      createdAt: video.createdAt,
      duration: video.duration,
      resolution: video.resolution,
      streamUrl,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});
