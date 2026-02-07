'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';
import { formatDistanceToNow } from 'date-fns'; // Need to install date-fns
import { Play, Lock, Eye, EyeOff, MoreVertical, Plus } from 'lucide-react';

interface Video {
  videoId: string;
  title: string;
  description: string;
  visibility: 'public' | 'unlisted' | 'private';
  thumbnailPath?: string;
  views: number;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  createdAt: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await api.get('/videos/my-videos');
        setVideos(response.data.data.videos);
      } catch (error) {
        console.error('Failed to fetch videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your videos and playlists
            </p>
          </div>
          <Link href="/upload">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Upload Video
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white text-center">
            <Play className="h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">
              No videos yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by uploading your first video.
            </p>
            <div className="mt-6">
              <Link href="/upload">
                <Button>Upload Video</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <Card key={video.videoId} className="overflow-hidden">
                <div className="relative aspect-video bg-gray-200">
                  {video.thumbnailPath ? (
                    <img
                      src={`/api/videos/${video.videoId}/thumbnail`} // Proxy handle this? No, backend doesn't serve thumbnail directly yet?
                      // Wait, we need a way to serve thumbnails. Backend Phase 3 said "Extracts a thumbnail image", but didn't explicitly mention a thumbnail endpoint.
                      // Actually, if it's local storage, we might need a route to serve it.
                      // Or just use a placeholder for now.
                      alt={video.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Play className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-xs font-medium text-white">
                    {video.status === 'ready' ? 'HD' : video.status}
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-gray-900 line-clamp-1">
                        <Link href={`/watch/${video.videoId}`} className="hover:underline">
                          {video.title}
                        </Link>
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(video.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      {video.visibility === 'private' ? (
                        <Lock className="mr-1.5 h-4 w-4" />
                      ) : video.visibility === 'unlisted' ? (
                        <EyeOff className="mr-1.5 h-4 w-4" />
                      ) : (
                        <Eye className="mr-1.5 h-4 w-4" />
                      )}
                      <span className="capitalize">{video.visibility}</span>
                    </div>
                    <div>{video.views} views</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
