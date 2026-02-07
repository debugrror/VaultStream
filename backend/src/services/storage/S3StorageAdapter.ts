import { StorageAdapter } from './StorageAdapter';
import { StorageFileMetadata } from '../../types';
import { Readable } from 'stream';

/**
 * S3/R2 storage adapter (stub for future implementation)
 * 
 * To implement:
 * 1. Install AWS SDK: npm install @aws-sdk/client-s3
 * 2. Configure S3Client with credentials from config
 * 3. Implement upload using PutObjectCommand
 * 4. Implement download using GetObjectCommand
 * 5. Implement downloadStream using GetObjectCommand (stream body)
 * 6. Implement delete using DeleteObjectCommand
 * 7. Implement exists using HeadObjectCommand
 * 8. For R2, use custom endpoint URL
 */
export class S3StorageAdapter implements StorageAdapter {
  constructor() {
    throw new Error(
      'S3StorageAdapter not yet implemented. Set STORAGE_TYPE=local in .env'
    );
  }

  async upload(
    _file: Buffer,
    _path: string,
    _metadata?: StorageFileMetadata
  ): Promise<string> {
    throw new Error('Not implemented');
  }

  async download(_path: string): Promise<Buffer> {
    throw new Error('Not implemented');
  }

  async downloadStream(_path: string): Promise<Readable> {
    throw new Error('Not implemented');
  }

  async delete(_path: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async exists(_path: string): Promise<boolean> {
    throw new Error('Not implemented');
  }

  async getPath(_path: string): Promise<string> {
    throw new Error('Not implemented');
  }

  async deleteDirectory(_dirPath: string): Promise<void> {
    throw new Error('Not implemented');
  }
}

