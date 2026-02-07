import { StorageFileMetadata } from '../../types';
import { Readable } from 'stream';

/**
 * Abstract storage adapter interface
 * All storage backends (local, S3, R2) must implement this interface
 */
export interface StorageAdapter {
  /**
   * Upload a file to storage
   * @param file - File buffer
   * @param path - Storage path (e.g., 'videos/userId/videoId/video.mp4')
   * @param metadata - Optional metadata (content type, size, etc.)
   * @returns Full storage path
   */
  upload(file: Buffer, path: string, metadata?: StorageFileMetadata): Promise<string>;

  /**
   * Download a file from storage (loads entire file into memory)
   * Use for small files only (playlists, metadata, etc.)
   * @param path - Storage path
   * @returns File buffer
   */
  download(path: string): Promise<Buffer>;

  /**
   * Download a file as a readable stream (memory-efficient)
   * Use for large files (video segments, media files)
   * @param path - Storage path
   * @returns Readable stream
   */
  downloadStream(path: string): Promise<Readable>;

  /**
   * Delete a file from storage
   * @param path - Storage path
   */
  delete(path: string): Promise<void>;

  /**
   * Check if a file exists
   * @param path - Storage path
   * @returns True if file exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get the absolute path or URL for a file
   * @param path - Storage path
   * @returns Absolute path or URL
   */
  getPath(path: string): Promise<string>;

  /**
   * Delete an entire directory
   * @param dirPath - Directory path
   */
  deleteDirectory(dirPath: string): Promise<void>;
}

