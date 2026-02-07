import { Router } from 'express';
import { body } from 'express-validator';
import * as playlistController from '@controllers/playlistController';
import { authenticate, optionalAuthenticate } from '@middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

/**
 * POST /api/playlists
 * Create a new playlist (requires authentication)
 */
router.post(
  '/',
  authenticate,
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 200 })
      .withMessage('Title must not exceed 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Description must not exceed 2000 characters'),
    body('visibility')
      .optional()
      .isIn(['public', 'unlisted', 'private'])
      .withMessage('Invalid visibility value'),
    validate,
  ],
  playlistController.createPlaylist
);

/**
 * GET /api/playlists/my-playlists
 * Get current user's playlists (requires authentication)
 */
router.get('/my-playlists', authenticate, playlistController.getMyPlaylists);

/**
 * GET /api/playlists/:playlistId
 * Get playlist by ID (optional authentication for access control)
 */
router.get('/:playlistId', optionalAuthenticate, playlistController.getPlaylist);

/**
 * PATCH /api/playlists/:playlistId
 * Update playlist metadata (requires authentication)
 */
router.patch(
  '/:playlistId',
  authenticate,
  [
    body('title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Title cannot be empty')
      .isLength({ max: 200 })
      .withMessage('Title must not exceed 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Description must not exceed 2000 characters'),
    body('visibility')
      .optional()
      .isIn(['public', 'unlisted', 'private'])
      .withMessage('Invalid visibility value'),
    validate,
  ],
  playlistController.updatePlaylist
);

/**
 * DELETE /api/playlists/:playlistId
 * Delete playlist (requires authentication)
 */
router.delete('/:playlistId', authenticate, playlistController.deletePlaylist);

/**
 * POST /api/playlists/:playlistId/videos
 * Add video to playlist (requires authentication)
 */
router.post(
  '/:playlistId/videos',
  authenticate,
  [body('videoId').notEmpty().withMessage('Video ID is required'), validate],
  playlistController.addVideoToPlaylist
);

/**
 * DELETE /api/playlists/:playlistId/videos/:videoId
 * Remove video from playlist (requires authentication)
 */
router.delete(
  '/:playlistId/videos/:videoId',
  authenticate,
  playlistController.removeVideoFromPlaylist
);

/**
 * PUT /api/playlists/:playlistId/reorder
 * Reorder videos in playlist (requires authentication)
 */
router.put(
  '/:playlistId/reorder',
  authenticate,
  [
    body('videoIds')
      .isArray()
      .withMessage('videoIds must be an array')
      .notEmpty()
      .withMessage('videoIds cannot be empty'),
    validate,
  ],
  playlistController.reorderPlaylist
);

export default router;
