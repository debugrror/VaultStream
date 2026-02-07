import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Playlist visibility type
 */
export type PlaylistVisibility = 'public' | 'unlisted' | 'private';

/**
 * Playlist item (video reference with ordering)
 */
export interface IPlaylistItem {
  videoId: string;
  addedAt: Date;
  order: number;
}

/**
 * Playlist document interface
 */
export interface IPlaylist extends Document {
  playlistId: string;
  userId: string;
  title: string;
  description: string;
  visibility: PlaylistVisibility;
  videos: IPlaylistItem[];
  thumbnailVideoId?: string; // Use first video's thumbnail by default
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Playlist schema
 */
const PlaylistSchema = new Schema<IPlaylist>(
  {
    playlistId: {
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
      maxlength: [2000, 'Description must not exceed 2000 characters'],
    },
    visibility: {
      type: String,
      enum: ['public', 'unlisted', 'private'],
      default: 'unlisted',
      index: true,
    },
    videos: [
      {
        videoId: {
          type: String,
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        order: {
          type: Number,
          required: true,
        },
        _id: false, // Disable _id for subdocuments
      },
    ],
    thumbnailVideoId: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'playlists',
  }
);

/**
 * Indexes for performance
 */
PlaylistSchema.index({ userId: 1, createdAt: -1 });
PlaylistSchema.index({ visibility: 1, createdAt: -1 });
PlaylistSchema.index({ 'videos.videoId': 1 });

/**
 * Playlist model
 */
export const Playlist: Model<IPlaylist> = mongoose.model<IPlaylist>(
  'Playlist',
  PlaylistSchema
);
