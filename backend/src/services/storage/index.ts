import { StorageAdapter } from './StorageAdapter';
import { LocalStorageAdapter } from './LocalStorageAdapter';
import { S3StorageAdapter } from './S3StorageAdapter';
import { config } from '@config/env';
import { logger } from '@utils/logger';

/**
 * Storage adapter factory
 * Returns the appropriate storage adapter based on configuration
 */
class StorageService {
  private static instance: StorageAdapter;

  /**
   * Get storage adapter instance (singleton)
   */
  static getAdapter(): StorageAdapter {
    if (!StorageService.instance) {
      StorageService.instance = StorageService.createAdapter();
    }
    return StorageService.instance;
  }

  /**
   * Create storage adapter based on config
   */
  private static createAdapter(): StorageAdapter {
    const storageType = config.storage.type;

    logger.info(`Initializing ${storageType} storage adapter`);

    switch (storageType) {
      case 'local':
        return new LocalStorageAdapter();
      case 's3':
      case 'r2':
        return new S3StorageAdapter();
      default:
        throw new Error(`Unknown storage type: ${storageType}`);
    }
  }
}

export const storageAdapter = StorageService.getAdapter();
export { StorageAdapter } from './StorageAdapter';
