import { Router } from 'express';
import * as channelController from '@controllers/channelController';
import { optionalAuthenticate, authenticate } from '@middleware/auth';

const router = Router();

/**
 * GET /api/channels/me
 * Get current user's channel (requires authentication)
 */
router.get('/me', authenticate, channelController.getMyChannel);

/**
 * GET /api/channels/:channelId
 * Get channel by ID (public)
 */
router.get('/:channelId', channelController.getChannel);

/**
 * GET /api/channels/:channelId/videos
 * Get videos for a channel (respects visibility)
 */
router.get('/:channelId/videos', optionalAuthenticate, channelController.getChannelVideos);

export default router;
