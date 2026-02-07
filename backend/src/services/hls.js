export function getSignedPlaybackUrl(videoId) {
  const baseUrl = process.env.HLS_BASE_URL || 'https://stream.example.com/hls';
  const token = Buffer.from(`${videoId}:${Date.now()}`).toString('base64url');
  return `${baseUrl}/${videoId}/master.m3u8?token=${token}`;
}
