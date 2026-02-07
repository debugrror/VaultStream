import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { storageAdapter } from './storage';
import { IVideo } from '@models/Video';
import { logger } from '@utils/logger';
import { config } from '@config/env';

/**
 * Video metadata extracted from FFmpeg
 */
interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  codec: string;
  fps: number;
  bitrate: number;
  format: string;
}

/**
 * Video processing service
 * Handles FFmpeg transcoding to HLS format
 */
export class VideoProcessingService {
  /**
   * Process video: transcode to HLS and generate thumbnail
   * @param video - Video document
   * @param inputPath - Absolute path to input video file
   */
  static async processVideo(video: IVideo, inputPath: string): Promise<void> {
    let metadata: VideoMetadata | null = null;
    
    try {
      logger.info('Starting video processing', { videoId: video.videoId });

      // Update status to processing
      video.status = 'processing';
      await video.save();

      // Get HLS output directory
      const hlsDir = await storageAdapter.getPath(video.hlsPath);

      // Extract metadata first
      metadata = await this.extractMetadata(inputPath);
      
      logger.info('Video metadata extracted', {
        videoId: video.videoId,
        metadata,
      });
      
      // Update video with metadata
      video.duration = metadata.duration;
      video.resolution = {
        width: metadata.width,
        height: metadata.height,
      };
      await video.save();

      // Determine quality levels based on resolution (adaptive, no upscaling)
      const qualities = this.determineQualityLevels(metadata.width, metadata.height);
      
      logger.info('Determined quality levels', {
        videoId: video.videoId,
        inputResolution: `${metadata.width}x${metadata.height}`,
        plannedRenditions: qualities.map(q => q.name),
      });

      // Generate HLS playlists for each quality (returns only succeeded)
      const succeededQualities = await this.generateHLS(inputPath, hlsDir, qualities, video.videoId);

      if (succeededQualities.length === 0) {
        throw new Error('No renditions were successfully generated');
      }

      // Generate master playlist with only succeeded renditions
      await this.generateMasterPlaylist(hlsDir, succeededQualities, video);

      // Generate thumbnail
      await this.generateThumbnail(inputPath, hlsDir, video);

      // Update status to ready
      video.status = 'ready';
      video.masterPlaylistPath = `${video.hlsPath}/master.m3u8`;
      await video.save();

      logger.info('Video processing completed', { 
        videoId: video.videoId,
        succeededRenditions: succeededQualities.map(q => q.name),
      });
    } catch (error) {
      logger.error('Video processing failed', {
        videoId: video.videoId,
        error: error instanceof Error ? error.message : error,
        // Log probe data for debugging
        metadata: metadata ? {
          resolution: `${metadata.width}x${metadata.height}`,
          duration: metadata.duration,
          codec: metadata.codec,
          fps: metadata.fps,
          bitrate: metadata.bitrate,
          format: metadata.format,
        } : 'Not available',
      });

      // Update status to failed
      video.status = 'failed';
      video.processingError = error instanceof Error ? error.message : 'Unknown error';
      await video.save();

      throw error;
    }
  }

  /**
   * Extract video metadata using FFprobe
   */
  private static extractMetadata(inputPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          return reject(err);
        }

        const videoStream = metadata.streams.find(
          (stream) => stream.codec_type === 'video'
        );

        if (!videoStream) {
          return reject(new Error('No video stream found'));
        }

        // Extract FPS (frames per second)
        let fps = 30; // default
        if (videoStream.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
          fps = den ? num / den : num;
        } else if (videoStream.avg_frame_rate) {
          const [num, den] = videoStream.avg_frame_rate.split('/').map(Number);
          fps = den ? num / den : num;
        }

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          codec: videoStream.codec_name || 'unknown',
          fps: Math.round(fps),
          bitrate: metadata.format.bit_rate || 0,
          format: metadata.format.format_name || 'unknown',
        });
      });
    });
  }

  /**
   * Available HLS renditions (height-based)
   */
  private static readonly AVAILABLE_RENDITIONS = [
    { height: 1080, bitrate: '5000k' },
    { height: 720, bitrate: '2800k' },
    { height: 480, bitrate: '1400k' },
    { height: 360, bitrate: '800k' },
  ];

  /**
   * Determine quality levels based on source resolution
   * Only generates renditions at or below input height (no upscaling)
   */
  private static determineQualityLevels(
    width: number,
    height: number
  ): Array<{ name: string; height: number; bitrate: string }> {
    // Filter renditions to only include those at or below input height
    const validRenditions = this.AVAILABLE_RENDITIONS.filter(
      (rendition) => rendition.height <= height
    );

    // Edge case: if input is smaller than 360p, use source resolution
    if (validRenditions.length === 0) {
      logger.info('Input resolution below 360p, using source as single rendition', {
        width,
        height,
      });
      return [
        {
          name: `${height}p`,
          height: height,
          bitrate: '800k', // Use minimum bitrate for small videos
        },
      ];
    }

    // Map to quality objects
    return validRenditions.map((rendition) => ({
      name: `${rendition.height}p`,
      height: rendition.height,
      bitrate: rendition.bitrate,
    }));
  }

  /**
   * Generate HLS stream for all quality levels
   * Runs sequentially to avoid file contention issues when multiple FFmpeg
   * processes access the same input file simultaneously
   */
  private static async generateHLS(
    inputPath: string,
    outputDir: string,
    qualities: Array<{ name: string; height: number; bitrate: string }>,
    videoId: string
  ): Promise<Array<{ name: string; height: number; bitrate: string }>> {
    // Ensure output directory exists before running FFmpeg
    const fs = require('fs/promises');
    await fs.mkdir(outputDir, { recursive: true });

    const succeededQualities: Array<{ name: string; height: number; bitrate: string }> = [];
    const failedQualities: string[] = [];

    // Run sequentially to prevent file contention on input file
    for (const quality of qualities) {
      try {
        await this.generateQualityPlaylist(inputPath, outputDir, quality, videoId);
        succeededQualities.push(quality);
      } catch (error) {
        failedQualities.push(quality.name);
        logger.warn(`Rendition ${quality.name} failed, continuing with others`, {
          videoId,
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    if (succeededQualities.length === 0) {
      throw new Error('All renditions failed to generate');
    }

    if (failedQualities.length > 0) {
      logger.warn('Some renditions failed to generate', {
        videoId,
        total: qualities.length,
        succeeded: succeededQualities.length,
        failed: failedQualities.length,
        failedRenditions: failedQualities,
      });
    }

    return succeededQualities;
  }

  /**
   * Generate HLS playlist for a specific quality level
   * Uses aspect-ratio-safe scaling: scale=-2:<height>
   * Requires -f hls flag to explicitly set output format for HLS container
   */
  private static generateQualityPlaylist(
    inputPath: string,
    outputDir: string,
    quality: { name: string; height: number; bitrate: string },
    videoId: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const playlistName = `${quality.name}.m3u8`;
      const segmentPattern = `${quality.name}_%03d.ts`;
      const outputPath = path.join(outputDir, playlistName);
      const segmentPath = path.join(outputDir, segmentPattern);

      // Build output options array
      const outputOptions = [
        // Explicitly set HLS format (required - FFmpeg may not infer from .m3u8 extension)
        '-f hls',
        '-c:v libx264',
        '-c:a aac',
        `-b:v ${quality.bitrate}`,
        '-b:a 128k',
        // Use aspect-ratio-safe scaling: -2 means calculate width to maintain aspect ratio with even number
        `-vf scale=-2:${quality.height}`,
        '-profile:v main',
        '-preset fast',
        '-sc_threshold 0',
        '-g 48',
        '-keyint_min 48',
        '-hls_time ' + config.video.hlsSegmentDuration,
        '-hls_playlist_type vod',
        // Ensure each segment is independently decodable
        '-hls_flags independent_segments',
        '-hls_segment_filename ' + segmentPath,
      ];

      // Debug: Log exact FFmpeg arguments (remove after verification)
      logger.debug('FFmpeg HLS command', {
        videoId,
        quality: quality.name,
        input: inputPath,
        output: outputPath,
        options: outputOptions,
      });

      ffmpeg(inputPath)
        .output(outputPath)
        .outputOptions(outputOptions)
        .on('end', () => {
          logger.debug(`Generated ${quality.name} playlist`, { videoId });
          resolve();
        })
        .on('error', (err) => {
          logger.error(`Failed to generate ${quality.name} playlist`, {
            videoId,
            error: err.message,
          });
          reject(err);
        })
        .run();
    });
  }

  /**
   * Generate master HLS playlist
   * Only includes successfully generated renditions
   */
  private static async generateMasterPlaylist(
    outputDir: string,
    qualities: Array<{ name: string; height: number; bitrate: string }>,
    video: IVideo
  ): Promise<void> {
    let masterContent = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

    for (const quality of qualities) {
      const bandwidth = parseInt(quality.bitrate) * 1000; // Convert to bps
      
      // Calculate width from height maintaining common aspect ratios
      // For simplicity, assume 16:9 aspect ratio for resolution display
      const width = Math.round((quality.height * 16) / 9);
      
      masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${width}x${quality.height}\n`;
      masterContent += `${quality.name}.m3u8\n`;
    }

    const masterPath = path.join(outputDir, 'master.m3u8');
    const fs = require('fs/promises');
    await fs.writeFile(masterPath, masterContent);

    logger.debug('Generated master playlist', { videoId: video.videoId });
  }

  /**
   * Generate thumbnail from video
   */
  private static generateThumbnail(
    inputPath: string,
    outputDir: string,
    video: IVideo
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const thumbnailPath = path.join(outputDir, 'thumbnail.jpg');

      ffmpeg(inputPath)
        .screenshots({
          timestamps: ['10%'],
          filename: 'thumbnail.jpg',
          folder: outputDir,
          size: '1280x720',
        })
        .on('end', () => {
          video.thumbnailPath = `${video.hlsPath}/thumbnail.jpg`;
          logger.debug('Generated thumbnail', { videoId: video.videoId });
          resolve();
        })
        .on('error', (err) => {
          logger.warn('Failed to generate thumbnail', {
            videoId: video.videoId,
            error: err.message,
          });
          // Don't fail the entire process if thumbnail generation fails
          resolve();
        });
    });
  }

  /**
   * Delete all video files
   */
  static async deleteVideoFiles(video: IVideo): Promise<void> {
    try {
      // Delete original file
      await storageAdapter.delete(video.storagePath);

      // Delete HLS directory (contains all playlists and segments)
      await storageAdapter.deleteDirectory(video.hlsPath);

      logger.info('Deleted video files', { videoId: video.videoId });
    } catch (error) {
      logger.error('Failed to delete video files', {
        videoId: video.videoId,
        error,
      });
      throw error;
    }
  }
}
