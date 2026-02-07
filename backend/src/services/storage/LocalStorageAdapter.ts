import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import path from 'path';
import { StorageAdapter } from './StorageAdapter';
import { StorageFileMetadata } from '../../types';
import { logger } from '@utils/logger';
import { ApiError } from '@utils/ApiError';
import { config } from '@config/env';

/**
 * Local filesystem storage adapter
 * Stores files in the local filesystem
 */
export class LocalStorageAdapter implements StorageAdapter {
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath || config.storage.localPath;
    this.ensureBasePath();
  }

  /**
   * Ensure base storage directory exists
   */
  private async ensureBasePath(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create base storage directory', error);
      throw error;
    }
  }

  /**
   * Get full absolute path
   */
  private getAbsolutePath(relativePath: string): string {
    return path.join(this.basePath, relativePath);
  }

  /**
   * Ensure directory exists for a file path
   */
  private async ensureDirectory(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * Upload file to local storage
   */
  async upload(
    file: Buffer,
    storagePath: string,
    _metadata?: StorageFileMetadata
  ): Promise<string> {
    const absolutePath = this.getAbsolutePath(storagePath);

    try {
      await this.ensureDirectory(absolutePath);
      await fs.writeFile(absolutePath, file);
      logger.debug('File uploaded to local storage', { path: storagePath });
      return storagePath;
    } catch (error) {
      logger.error('Failed to upload file to local storage', error);
      throw ApiError.internal('Failed to upload file');
    }
  }

  /**
   * Download file from local storage
   */
  async download(storagePath: string): Promise<Buffer> {
    const absolutePath = this.getAbsolutePath(storagePath);

    try {
      const buffer = await fs.readFile(absolutePath);
      return buffer;
    } catch (error) {
      logger.error('Failed to download file from local storage', error);
      throw ApiError.notFound('File not found');
    }
  }

  /**
   * Download file as a readable stream (memory-efficient)
   * Use for large files like video segments
   */
  async downloadStream(storagePath: string): Promise<Readable> {
    const absolutePath = this.getAbsolutePath(storagePath);

    // Check if file exists first
    try {
      await fs.access(absolutePath);
    } catch {
      throw ApiError.notFound('File not found');
    }

    // Return readable stream
    const stream = createReadStream(absolutePath);
    return stream;
  }

  /**
   * Delete file from local storage
   */
  async delete(storagePath: string): Promise<void> {
    const absolutePath = this.getAbsolutePath(storagePath);

    try {
      await fs.unlink(absolutePath);
      logger.debug('File deleted from local storage', { path: storagePath });
    } catch (error) {
      logger.error('Failed to delete file from local storage', error);
      // Don't throw error if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw ApiError.internal('Failed to delete file');
      }
    }
  }

  /**
   * Check if file exists
   */
  async exists(storagePath: string): Promise<boolean> {
    const absolutePath = this.getAbsolutePath(storagePath);

    try {
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get absolute path for a file
   */
  async getPath(storagePath: string): Promise<string> {
    return this.getAbsolutePath(storagePath);
  }

  /**
   * Delete entire directory
   */
  async deleteDirectory(dirPath: string): Promise<void> {
    const absolutePath = this.getAbsolutePath(dirPath);

    try {
      await fs.rm(absolutePath, { recursive: true, force: true });
      logger.debug('Directory deleted from local storage', { path: dirPath });
    } catch (error) {
      logger.error('Failed to delete directory from local storage', error);
      throw ApiError.internal('Failed to delete directory');
    }
  }
}
