import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { pipeline } from 'stream/promises';

/**
 * Safely move a file from source to destination, handling cross-device moves.
 * 
 * First attempts a simple rename (fast, atomic).
 * If EXDEV error occurs (cross-device link not permitted), falls back to
 * streaming copy + delete (slower, but works across filesystems).
 * 
 * @param src - Source file path
 * @param dest - Destination file path
 * @throws Error if move fails for reasons other than EXDEV
 */
export async function moveFileSafe(src: string, dest: string): Promise<void> {
  try {
    // Attempt fast atomic rename
    await fsPromises.rename(src, dest);
  } catch (error: any) {
    // Check if error is EXDEV (cross-device link not permitted)
    if (error.code === 'EXDEV') {
      // Fallback: Stream copy + delete
      const readStream = fs.createReadStream(src);
      const writeStream = fs.createWriteStream(dest);
      
      try {
        // Stream file from src to dest (no buffering in memory)
        await pipeline(readStream, writeStream);
        
        // Delete source file after successful copy
        await fsPromises.unlink(src);
      } catch (streamError) {
        // Clean up partial destination file on failure
        await fsPromises.unlink(dest).catch(() => {});
        throw streamError;
      }
    } else {
      // Re-throw all non-EXDEV errors
      throw error;
    }
  }
}
