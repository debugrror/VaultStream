import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Playlist } from '@models/Playlist';
import { Video } from '@models/Video';
import { asyncHandler } from '@middleware/errorHandler';
import { ApiError } from '@utils/ApiError';
import { logger } from '@utils/logger';
import type { ApiResponse, AuthenticatedRequest } from '../types';

/**
 * Create a new playlist
 * POST /api/playlists
 */
export const createPlaylist = asyncHandler(
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const { title, description, visibility } = req.body;

    if (!title || title.trim().length === 0) {
      throw ApiError.badRequest('Title is required', 'MISSING_TITLE');
    }

    const playlist = new Playlist({
      playlistId: uuidv4(),
      userId: authReq.user.userId,
      title: title.trim(),
      description: description?.trim() || '',
      visibility: visibility || 'unlisted',
      videos: [],
    });

    await playlist.save();

    const response: ApiResponse = {
      success: true,
      data: {
        playlist: {
          playlistId: playlist.playlistId,
          title: playlist.title,
          description: playlist.description,
          visibility: playlist.visibility,
          videoCount: 0,
          createdAt: playlist.createdAt,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.status(201).json(response);
  }
);

/**
 * Get playlist by ID
 * GET /api/playlists/:playlistId
 */
export const getPlaylist = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { playlistId } = req.params;

  const playlist = await Playlist.findOne({ playlistId });

  if (!playlist) {
    throw ApiError.notFound('Playlist not found', 'PLAYLIST_NOT_FOUND');
  }

  // Check access permissions
  const isOwner = authReq.user && authReq.user.userId === playlist.userId;

  if (playlist.visibility === 'private' && !isOwner) {
    throw ApiError.forbidden('Access denied', 'ACCESS_DENIED');
  }

  // Fetch video details for accessible videos
  const accessibleVideos = await getAccessibleVideos(
    playlist.videos,
    authReq.user?.userId,
    playlist.userId
  );

  const response: ApiResponse = {
    success: true,
    data: {
      playlist: {
        playlistId: playlist.playlistId,
        title: playlist.title,
        description: playlist.description,
        visibility: playlist.visibility,
        videoCount: accessibleVideos.length,
        videos: accessibleVideos,
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt,
        isOwner,
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * Get user's playlists
 * GET /api/playlists/my-playlists
 */
export const getMyPlaylists = asyncHandler(
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const playlists = await Playlist.find({ userId: authReq.user.userId })
      .sort({ createdAt: -1 })
      .select('-__v');

    const response: ApiResponse = {
      success: true,
      data: {
        playlists: playlists.map((p) => ({
          playlistId: p.playlistId,
          title: p.title,
          description: p.description,
          visibility: p.visibility,
          videoCount: p.videos.length,
          thumbnailVideoId: p.thumbnailVideoId || p.videos[0]?.videoId,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
        total: playlists.length,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  }
);

/**
 * Update playlist metadata
 * PATCH /api/playlists/:playlistId
 */
export const updatePlaylist = asyncHandler(
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const { playlistId } = req.params;
    const { title, description, visibility } = req.body;

    const playlist = await Playlist.findOne({ playlistId });

    if (!playlist) {
      throw ApiError.notFound('Playlist not found', 'PLAYLIST_NOT_FOUND');
    }

    // Check ownership
    if (playlist.userId !== authReq.user.userId) {
      throw ApiError.forbidden('Access denied', 'ACCESS_DENIED');
    }

    // Update fields
    if (title !== undefined) {
      playlist.title = title.trim();
    }
    if (description !== undefined) {
      playlist.description = description.trim();
    }
    if (visibility !== undefined) {
      if (!['public', 'unlisted', 'private'].includes(visibility)) {
        throw ApiError.badRequest('Invalid visibility value', 'INVALID_VISIBILITY');
      }
      playlist.visibility = visibility;
    }

    await playlist.save();

    const response: ApiResponse = {
      success: true,
      data: {
        playlist: {
          playlistId: playlist.playlistId,
          title: playlist.title,
          description: playlist.description,
          visibility: playlist.visibility,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  }
);

/**
 * Delete playlist
 * DELETE /api/playlists/:playlistId
 */
export const deletePlaylist = asyncHandler(
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const { playlistId } = req.params;

    const playlist = await Playlist.findOne({ playlistId });

    if (!playlist) {
      throw ApiError.notFound('Playlist not found', 'PLAYLIST_NOT_FOUND');
    }

    // Check ownership
    if (playlist.userId !== authReq.user.userId) {
      throw ApiError.forbidden('Access denied', 'ACCESS_DENIED');
    }

    await Playlist.deleteOne({ playlistId });

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Playlist deleted successfully',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  }
);

/**
 * Add video to playlist
 * POST /api/playlists/:playlistId/videos
 */
export const addVideoToPlaylist = asyncHandler(
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const { playlistId } = req.params;
    const { videoId } = req.body;

    if (!videoId) {
      throw ApiError.badRequest('Video ID is required', 'MISSING_VIDEO_ID');
    }

    const playlist = await Playlist.findOne({ playlistId });

    if (!playlist) {
      throw ApiError.notFound('Playlist not found', 'PLAYLIST_NOT_FOUND');
    }

    // Check ownership
    if (playlist.userId !== authReq.user.userId) {
      throw ApiError.forbidden('Access denied', 'ACCESS_DENIED');
    }

    // Verify video exists and user has access
    const video = await Video.findOne({ videoId });

    if (!video) {
      throw ApiError.notFound('Video not found', 'VIDEO_NOT_FOUND');
    }

    // Can only add own videos or public/unlisted videos
    const canAdd =
      video.userId === authReq.user.userId ||
      video.visibility === 'public' ||
      video.visibility === 'unlisted';

    if (!canAdd) {
      throw ApiError.forbidden('Cannot add private video', 'CANNOT_ADD_PRIVATE');
    }

    // Check if video already in playlist
    const exists = playlist.videos.some((v) => v.videoId === videoId);
    if (exists) {
      throw ApiError.badRequest(
        'Video already in playlist',
        'VIDEO_ALREADY_IN_PLAYLIST'
      );
    }

    // Add video with next order number
    const nextOrder = playlist.videos.length;
    playlist.videos.push({
      videoId,
      addedAt: new Date(),
      order: nextOrder,
    });

    // Set thumbnail if first video
    if (!playlist.thumbnailVideoId) {
      playlist.thumbnailVideoId = videoId;
    }

    await playlist.save();

    logger.info('Video added to playlist', {
      playlistId,
      videoId,
      userId: authReq.user.userId,
    });

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Video added to playlist',
        videoCount: playlist.videos.length,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  }
);

/**
 * Remove video from playlist
 * DELETE /api/playlists/:playlistId/videos/:videoId
 */
export const removeVideoFromPlaylist = asyncHandler(
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const { playlistId, videoId } = req.params;

    const playlist = await Playlist.findOne({ playlistId });

    if (!playlist) {
      throw ApiError.notFound('Playlist not found', 'PLAYLIST_NOT_FOUND');
    }

    // Check ownership
    if (playlist.userId !== authReq.user.userId) {
      throw ApiError.forbidden('Access denied', 'ACCESS_DENIED');
    }

    // Remove video
    const initialLength = playlist.videos.length;
    playlist.videos = playlist.videos.filter((v) => v.videoId !== videoId);

    if (playlist.videos.length === initialLength) {
      throw ApiError.notFound('Video not in playlist', 'VIDEO_NOT_IN_PLAYLIST');
    }

    // Reorder remaining videos
    playlist.videos.forEach((v, index) => {
      v.order = index;
    });

    // Update thumbnail if removed video was thumbnail
    if (playlist.thumbnailVideoId === videoId) {
      playlist.thumbnailVideoId = playlist.videos[0]?.videoId;
    }

    await playlist.save();

    logger.info('Video removed from playlist', {
      playlistId,
      videoId,
      userId: authReq.user.userId,
    });

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Video removed from playlist',
        videoCount: playlist.videos.length,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  }
);

/**
 * Reorder videos in playlist
 * PUT /api/playlists/:playlistId/reorder
 */
export const reorderPlaylist = asyncHandler(
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const { playlistId } = req.params;
    const { videoIds } = req.body;

    if (!Array.isArray(videoIds)) {
      throw ApiError.badRequest('videoIds must be an array', 'INVALID_VIDEO_IDS');
    }

    const playlist = await Playlist.findOne({ playlistId });

    if (!playlist) {
      throw ApiError.notFound('Playlist not found', 'PLAYLIST_NOT_FOUND');
    }

    // Check ownership
    if (playlist.userId !== authReq.user.userId) {
      throw ApiError.forbidden('Access denied', 'ACCESS_DENIED');
    }

    // Verify all videoIds exist in playlist
    const currentVideoIds = playlist.videos.map((v) => v.videoId);
    const allExist = videoIds.every((id) => currentVideoIds.includes(id));

    if (!allExist || videoIds.length !== currentVideoIds.length) {
      throw ApiError.badRequest(
        'Invalid video IDs or count mismatch',
        'INVALID_REORDER'
      );
    }

    // Reorder videos
    const reorderedVideos = videoIds.map((videoId, index) => {
      const video = playlist.videos.find((v) => v.videoId === videoId);
      return {
        videoId,
        addedAt: video?.addedAt || new Date(),
        order: index,
      };
    });

    playlist.videos = reorderedVideos;
    await playlist.save();

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Playlist reordered successfully',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  }
);

/**
 * Helper: Get accessible videos from playlist
 * Respects video visibility rules:
 * - Private videos: only owner can see
 * - Unlisted/Public: anyone can see
 * - Passphrase-protected: indicated but not filtered (client must request access)
 */
async function getAccessibleVideos(
  playlistVideos: any[],
  requestUserId: string | undefined,
  playlistOwnerId: string
): Promise<any[]> {
  if (playlistVideos.length === 0) {
    return [];
  }

  const videoIds = playlistVideos.map((v) => v.videoId);

  // Fetch all videos
  const videos = await Video.find({ videoId: { $in: videoIds } }).select(
    'videoId title description visibility duration resolution thumbnailPath views createdAt userId'
  );

  const videoMap = new Map(videos.map((v) => [v.videoId, v]));

  // Filter and map accessible videos
  const accessible: any[] = [];

  for (const pv of playlistVideos) {
    const video = videoMap.get(pv.videoId);

    if (!video) {
      // Video deleted, skip
      continue;
    }

    // Access control
    if (video.visibility === 'private') {
      // Only owner can see private videos
      if (requestUserId !== video.userId && requestUserId !== playlistOwnerId) {
        continue;
      }
    }

    accessible.push({
      videoId: video.videoId,
      title: video.title,
      description: video.description,
      visibility: video.visibility,
      duration: video.duration,
      resolution: video.resolution,
      thumbnailPath: video.thumbnailPath,
      views: video.views,
      createdAt: video.createdAt,
      addedAt: pv.addedAt,
      order: pv.order,
    });
  }

  // Sort by order
  accessible.sort((a, b) => a.order - b.order);

  return accessible;
}
