import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import type { VideoVisibility, VideoStatus } from '../types';

/**
 * Video document interface
 */
export interface IVideo extends Document {
  videoId: string;
  userId: string;
  title: string;
  description: string;
  visibility: VideoVisibility;
  passphraseHash?: string;
  
  // File paths
  originalFilename: string;
  storagePath: string;
  hlsPath: string;
  masterPlaylistPath: string;
  thumbnailPath?: string;
  
  // Video metadata
  duration?: number;
  resolution?: {
    width: number;
    height: number;
  };
  fileSize: number;
  mimeType: string;
  
  // Processing status
  status: VideoStatus;
  processingError?: string;
  
  // Stats
  views: number;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Video schema
 */
const VideoSchema = new Schema<IVideo>(
  {
    videoId: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title must not exceed 200 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [5000, 'Description must not exceed 5000 characters'],
    },
    visibility: {
      type: String,
      enum: ['public', 'unlisted', 'private'],
      default: 'unlisted',
      index: true,
    },
    passphraseHash: {
      type: String,
      select: false, // Don't include by default
    },
    originalFilename: {
      type: String,
      required: true,
    },
    storagePath: {
      type: String,
      required: true,
    },
    hlsPath: {
      type: String,
      required: true,
    },
    masterPlaylistPath: {
      type: String,
    },
    thumbnailPath: {
      type: String,
    },
    duration: {
      type: Number,
    },
    resolution: {
      width: {
        type: Number,
      },
      height: {
        type: Number,
      },
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['uploading', 'processing', 'ready', 'failed'],
      default: 'uploading',
      index: true,
    },
    processingError: {
      type: String,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'videos',
  }
);

/**
 * Indexes for performance
 */
VideoSchema.index({ userId: 1, createdAt: -1 });
VideoSchema.index({ status: 1, createdAt: -1 });
VideoSchema.index({ visibility: 1, createdAt: -1 });

/**
 * Video model
 */
export const Video: Model<IVideo> = mongoose.model<IVideo>('Video', VideoSchema);
