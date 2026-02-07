'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/Card';
import api from '@/lib/axios';
import { Play, User } from 'lucide-react';

interface Channel {
  channelId: string;
  username: string;
  createdAt: string;
}

interface Video {
  videoId: string;
  title: string;
  description: string;
  visibility: string;
  views: number;
  thumbnailPath?: string;
  createdAt: string;
}

export default function ChannelPage() {
  const { channelId } = useParams();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChannelData = async () => {
      try {
        setLoading(true);
        // Fetch channel info
        const channelRes = await api.get(`/channels/${channelId}`);
        setChannel(channelRes.data.data.channel);

        // Fetch videos
        const videosRes = await api.get(`/channels/${channelId}/videos`);
        setVideos(videosRes.data.data.videos);
      } catch (error) {
        console.error('Failed to load channel data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (channelId) {
      fetchChannelData();
    }
  }, [channelId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : channel ? (
          <>
            <div className="mb-8 rounded-xl bg-white p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{channel.username}</h1>
                  <p className="text-sm text-gray-500">
                    Joined {new Date(channel.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">
                     @{channel.channelId}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Videos</h2>
              
              {videos.length === 0 ? (
                <p className="text-gray-500">No videos available.</p>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {videos.map((video) => (
                    <Card key={video.videoId} className="overflow-hidden hover:shadow-md transition-shadow">
                      <Link href={`/watch/${video.videoId}`}>
                        <div className="relative aspect-video bg-gray-200">
                           <div className="flex h-full items-center justify-center">
                              <Play className="h-8 w-8 text-gray-400" />
                           </div>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-gray-900 line-clamp-1">{video.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {video.views} views • {new Date(video.createdAt).toLocaleDateString()}
                          </p>
                        </CardContent>
                      </Link>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500">Channel not found</div>
        )}
      </main>
    </div>
  );
}
