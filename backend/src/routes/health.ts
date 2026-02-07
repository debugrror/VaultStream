import { Router } from 'express';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'VaultStream Backend',
  });
});

export default router;
