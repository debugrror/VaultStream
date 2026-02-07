import { Router } from 'express';
import { body } from 'express-validator';
import * as streamController from '@controllers/streamController';
import { optionalAuthenticate } from '@middleware/auth';
import { validateSignedUrl } from '@middleware/validateSignedUrl';
import { validate } from '../middleware/validate';

const router = Router();

/**
 * POST /api/videos/:videoId/access
 * Request access to a video (with optional passphrase)
 */
router.post(
  '/:videoId/access',
  optionalAuthenticate,
  [
    body('passphrase')
      .optional()
      .isString()
      .withMessage('Passphrase must be a string'),
    validate,
  ],
  streamController.requestVideoAccess
);

/**
 * GET /api/stream/:videoId/master.m3u8?token=...
 * Serve HLS master playlist (requires signed token)
 */
router.get(
  '/stream/:videoId/master.m3u8',
  validateSignedUrl,
  streamController.serveMasterPlaylist
);

/**
 * GET /api/stream/:videoId/:playlist?token=...
 * Serve variant playlist (e.g., 720p.m3u8)
 */
router.get(
  '/stream/:videoId/:playlist',
  validateSignedUrl,
  (req, res, next) => {
    // Route to appropriate controller based on file extension
    const playlist = req.params['playlist'];
    
    if (!playlist) {
      return res.status(400).json({ error: 'Playlist path required' });
    }

    if (playlist.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      streamController.serveVariantPlaylist(req, res, next);
    } else if (playlist.endsWith('.ts')) {
      streamController.serveSegment(req, res, next);
    } else {
      res.status(404).json({
        success: false,
        error: {
          message: 'Resource not found',
          code: 'NOT_FOUND',
        },
      });
    }
  }
);

export default router;
