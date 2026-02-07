import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, validateConfig } from '@config/env';
import { database } from '@config/database';
import { logger } from '@utils/logger';
import { errorHandler, notFoundHandler } from '@middleware/errorHandler';
import { requestLogger } from '@middleware/requestLogger';
import authRoutes from './routes/auth';
import videoRoutes from './routes/videos';
import streamRoutes from './routes/stream';
import channelRoutes from './routes/channels';
import playlistRoutes from './routes/playlists';
import healthRoutes from './routes/health';


/**
 * Initialize Express application
 */
function createApp(): Application {
  const app = express();

  // 🔑 TRUST PROXY (MUST BE FIRST)
  // We are behind Nginx (1 proxy hop)
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(cors({
    origin: config.cors.allowedOrigins,
    credentials: true,
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use(requestLogger);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: database.getConnectionStatus() ? 'connected' : 'disconnected',
      },
    });
  });

  // Health check (no auth required)
  app.use('/health', healthRoutes);

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/videos', videoRoutes);
  app.use('/api', streamRoutes); // Stream routes (both /videos/:id/access and /stream/:id/*)
  app.use('/api/channels', channelRoutes);
  app.use('/api/playlists', playlistRoutes);


  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Validate configuration
    validateConfig();

    // Connect to database
    await database.connect();

    // Create Express app
    const app = createApp();

    // Start listening
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(`📍 Environment: ${config.env}`);
      logger.info(`🔗 API: http://localhost:${config.port}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, closing server gracefully...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await database.disconnect();
          logger.info('Database disconnected');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
