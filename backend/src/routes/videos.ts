import { Router } from 'express';
import { body } from 'express-validator';
import * as videoController from '@controllers/videoController';
import { authenticate, optionalAuthenticate } from '@middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

/**
 * POST /api/videos/upload
 * Upload a new video (requires authentication)
 */
router.post(
  '/upload',
  authenticate,
  // Multer must run BEFORE validation to populate req.body from multipart/form-data
  videoController.uploadMiddleware,
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
      .isLength({ max: 5000 })
      .withMessage('Description must not exceed 5000 characters'),
    body('visibility')
      .optional()
      .isIn(['public', 'unlisted', 'private'])
      .withMessage('Invalid visibility value'),
    validate,
  ],
  videoController.uploadVideo
);

/**
 * GET /api/videos/my-videos
 * Get current user's videos (requires authentication)
 */
router.get('/my-videos', authenticate, videoController.getMyVideos);

/**
 * POST /api/videos/:videoId/access
 * Request video access - validates visibility + passphrase and returns signed stream URL
 */
router.post('/:videoId/access', optionalAuthenticate, videoController.requestVideoAccess);

/**
 * GET /api/videos/:videoId
 * Get video by ID (optional authentication)
 */
router.get('/:videoId', optionalAuthenticate, videoController.getVideo);

/**
 * PATCH /api/videos/:videoId
 * Update video metadata (requires authentication)
 */
router.patch(
  '/:videoId',
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
      .isLength({ max: 5000 })
      .withMessage('Description must not exceed 5000 characters'),
    body('visibility')
      .optional()
      .isIn(['public', 'unlisted', 'private'])
      .withMessage('Invalid visibility value'),
    validate,
  ],
  videoController.updateVideo
);

/**
 * DELETE /api/videos/:videoId
 * Delete video (requires authentication)
 */
router.delete('/:videoId', authenticate, videoController.deleteVideo);

export default router;
