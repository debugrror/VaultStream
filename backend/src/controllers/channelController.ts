import { Request, Response } from 'express';
import { User } from '@models/User';
import { Video } from '@models/Video';
import { asyncHandler } from '@middleware/errorHandler';
import { ApiError } from '@utils/ApiError';
import type { ApiResponse, AuthenticatedRequest } from '../types';

/**
 * Get channel by channelId
 * GET /api/channels/:channelId
 */
export const getChannel = asyncHandler(async (req: Request, res: Response) => {
  const { channelId } = req.params;

  // Find user by channelId
  const user = await User.findOne({ channelId }).select('userId username channelId createdAt');

  if (!user) {
    throw ApiError.notFound('Channel not found', 'CHANNEL_NOT_FOUND');
  }

  const response: ApiResponse = {
    success: true,
    data: {
      channel: {
        channelId: user.channelId,
        username: user.username,
        createdAt: user.createdAt,
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * Get videos for a channel
 * GET /api/channels/:channelId/videos
 */
export const getChannelVideos = asyncHandler(
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { channelId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Find user by channelId
    const user = await User.findOne({ channelId });

    if (!user) {
      throw ApiError.notFound('Channel not found', 'CHANNEL_NOT_FOUND');
    }

    // Build query based on visibility
    const query: any = { userId: user.userId, status: 'ready' };

    // If not the channel owner, only show public and unlisted videos
    const isOwner = authReq.user && authReq.user.userId === user.userId;
    if (!isOwner) {
      query.visibility = { $in: ['public', 'unlisted'] };
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Fetch videos
    const videos = await Video.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('-__v -passphraseHash');

    const total = await Video.countDocuments(query);

    const response: ApiResponse = {
      success: true,
      data: {
        videos: videos.map((v) => ({
          videoId: v.videoId,
          title: v.title,
          description: v.description,
          visibility: v.visibility,
          duration: v.duration,
          resolution: v.resolution,
          thumbnailPath: v.thumbnailPath,
          views: v.views,
          createdAt: v.createdAt,
          hasPassphrase: !!v.passphraseHash, // Indicate if passphrase is required
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
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
 * Get current user's channel
 * GET /api/channels/me
 */
export const getMyChannel = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  const user = await User.findOne({ userId: authReq.user.userId }).select(
    'userId username channelId createdAt'
  );

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const response: ApiResponse = {
    success: true,
    data: {
      channel: {
        channelId: user.channelId,
        username: user.username,
        userId: user.userId,
        createdAt: user.createdAt,
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});
