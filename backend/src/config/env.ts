import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

/**
 * Storage configuration type
 */
export type StorageType = 'local' | 's3' | 'r2';

/**
 * Application configuration interface
 */
export interface Config {
  env: 'development' | 'production' | 'test';
  port: number;
  mongodb: {
    uri: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  storage: {
    type: StorageType;
    localPath: string;
    tempUploadPath: string;
    s3?: {
      accessKeyId: string;
      secretAccessKey: string;
      bucketName: string;
      region: string;
      endpoint?: string;
    };
  };
  video: {
    hlsSegmentDuration: number;
    allowedFormats: string[];
    maxSizeMB: number;
  };
  security: {
    signedUrlExpiry: number;
    bcryptSaltRounds: number;
    hmacSecret: string;
  };
  cors: {
    allowedOrigins: string[];
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

/**
 * Get required environment variable
 */
function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get optional environment variable
 */
function getOptionalEnvVar(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

/**
 * Parse storage type
 */
function parseStorageType(type: string): StorageType {
  if (type !== 'local' && type !== 's3' && type !== 'r2') {
    throw new Error(`Invalid STORAGE_TYPE: ${type}. Must be 'local', 's3', or 'r2'`);
  }
  return type;
}

/**
 * Build configuration object from environment variables
 */
function buildConfig(): Config {
  const storageType = parseStorageType(getEnvVar('STORAGE_TYPE', 'local'));
  
  const config: Config = {
    env: (getEnvVar('NODE_ENV', 'development') as Config['env']),
    port: parseInt(getEnvVar('PORT', '5000'), 10),
    mongodb: {
      uri: getEnvVar('MONGODB_URI'),
    },
    jwt: {
      secret: getEnvVar('JWT_SECRET'),
      expiresIn: getEnvVar('JWT_EXPIRES_IN', '7d'),
    },
    storage: {
      type: storageType,
      localPath: path.resolve(getEnvVar('LOCAL_STORAGE_PATH', './uploads')),
      tempUploadPath: path.resolve(getEnvVar('TEMP_UPLOAD_PATH', '/tmp/vaultstream-uploads')),
    },
    video: {
      hlsSegmentDuration: parseInt(getEnvVar('HLS_SEGMENT_DURATION', '4'), 10),
      allowedFormats: getEnvVar('VIDEO_ALLOWED_FORMATS', 'mp4,mov,avi,mkv,webm').split(','),
      maxSizeMB: parseInt(getEnvVar('MAX_VIDEO_SIZE_MB', '2048'), 10),
    },
    security: {
      signedUrlExpiry: parseInt(getEnvVar('SIGNED_URL_EXPIRY_SECONDS', '3600'), 10),
      bcryptSaltRounds: parseInt(getEnvVar('BCRYPT_SALT_ROUNDS', '10'), 10),
      hmacSecret: getEnvVar('HMAC_SECRET'),
    },
    cors: {
      allowedOrigins: getEnvVar('ALLOWED_ORIGINS', 'http://localhost:3000').split(','),
    },
    rateLimit: {
      windowMs: parseInt(getEnvVar('RATE_LIMIT_WINDOW_MS', '900000'), 10),
      maxRequests: parseInt(getEnvVar('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
    },
  };

  // Validate S3/R2 config if needed
  if (storageType === 's3' || storageType === 'r2') {
    config.storage.s3 = {
      accessKeyId: getEnvVar('S3_ACCESS_KEY_ID'),
      secretAccessKey: getEnvVar('S3_SECRET_ACCESS_KEY'),
      bucketName: getEnvVar('S3_BUCKET_NAME'),
      region: getEnvVar('S3_REGION', 'us-east-1'),
      endpoint: getOptionalEnvVar('S3_ENDPOINT'),
    };
  }

  return config;
}

/**
 * Exported configuration object
 */
export const config: Config = buildConfig();

/**
 * Validate configuration on startup
 */
export function validateConfig(): void {
  console.log('🔍 Validating configuration...');
  
  // Check critical values
  if (config.port < 1 || config.port > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }
  
  if (config.jwt.secret.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters for production');
  }
  
  if (config.security.hmacSecret.length < 32) {
    console.warn('⚠️  WARNING: HMAC_SECRET should be at least 32 characters for production');
  }
  
  if (config.env === 'production') {
    if (config.jwt.secret === 'your-super-secret-jwt-key-change-this-in-production') {
      throw new Error('JWT_SECRET must be changed for production');
    }
    if (config.security.hmacSecret === 'your-hmac-secret-for-signed-urls-change-this') {
      throw new Error('HMAC_SECRET must be changed for production');
    }
  }
  
  console.log('✅ Configuration validated successfully');
  console.log(`📦 Environment: ${config.env}`);
  console.log(`🗄️  Storage: ${config.storage.type}`);
  console.log(`🔐 CORS Origins: ${config.cors.allowedOrigins.join(', ')}`);
}
