export const videoStore = new Map();

export function saveVideoRecord(video) {
  videoStore.set(video.id, {
    ...video,
    shareId: video.shareId || video.id,
    createdAt: new Date().toISOString()
  });
  return videoStore.get(video.id);
}
