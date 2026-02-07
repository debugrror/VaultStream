'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import api from '@/lib/axios';
import { Play, ListVideo, Lock, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Video {
  videoId: string;
  title: string;
  duration: number;
  visibility: string;
}

interface Playlist {
  playlistId: string;
  title: string;
  description: string;
  visibility: string;
  videoCount: number;
  videos: Video[];
  isOwner: boolean;
  createdAt: string;
}

export default function PlaylistPage() {
  const { playlistId } = useParams();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const response = await api.get(`/playlists/${playlistId}`);
        setPlaylist(response.data.data.playlist);
      } catch (error) {
        console.error('Failed to load playlist:', error);
        toast.error('Failed to load playlist');
      } finally {
        setLoading(false);
      }
    };

    if (playlistId) {
      fetchPlaylist();
    }
  }, [playlistId]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
             <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : playlist ? (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-6">
              <div className="aspect-video w-full rounded-xl bg-gray-900 flex flex-col items-center justify-center text-white shadow-lg p-6">
                 <ListVideo className="h-16 w-16 mb-4 text-gray-400" />
                 <span className="text-xl font-bold">{playlist.videoCount} videos</span>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                 <h1 className="text-2xl font-bold text-gray-900 mb-2">{playlist.title}</h1>
                 {playlist.description && (
                    <p className="text-gray-600 mb-4">{playlist.description}</p>
                 )}
                 
                 <div className="flex items-center text-sm text-gray-500 mb-6">
                    <span className="capitalize px-2 py-1 bg-gray-100 rounded text-gray-700 font-medium text-xs mr-2">
                       {playlist.visibility}
                    </span>
                    <span>Updated {new Date(playlist.createdAt).toLocaleDateString()}</span>
                 </div>

                 <div className="flex flex-col gap-3">
                    {playlist.videos.length > 0 && (
                       <Link href={`/watch/${playlist.videos[0].videoId}`} className="w-full">
                          <Button className="w-full">
                             <Play className="mr-2 h-4 w-4" /> Play All
                          </Button>
                       </Link>
                    )}
                    <Button variant="secondary" onClick={handleShare} className="w-full">
                       <Share2 className="mr-2 h-4 w-4" /> Share Playlist
                    </Button>
                 </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
               {playlist.videos.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
                     No videos in this playlist yet.
                  </div>
               ) : (
                  playlist.videos.map((video, index) => (
                     <Link href={`/watch/${video.videoId}`} key={video.videoId} className="block group">
                        <div className="flex bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow items-center gap-4">
                           <span className="text-gray-400 font-medium w-6 text-center">{index + 1}</span>
                           <div className="h-20 w-32 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center relative overflow-hidden group-hover:ring-2 ring-blue-500 transition-all">
                                <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity absolute z-10" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                <Play className="h-6 w-6 text-gray-400" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{video.title}</h3>
                              <div className="flex items-center text-sm text-gray-500 mt-1">
                                 {video.visibility === 'private' && (
                                    <div className="flex items-center mr-3 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-xs">
                                       <Lock className="h-3 w-3 mr-1" />
                                       Private
                                    </div>
                                 )}
                                 <span>Video • {Math.floor(video.duration || 0)}s</span>
                              </div>
                           </div>
                        </div>
                     </Link>
                  ))
               )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
             <Lock className="h-16 w-16 text-gray-300 mb-4" />
             <h2 className="text-xl font-semibold text-gray-900">Playlist Unavailable</h2>
             <p className="text-gray-500 mt-2">This playlist is private or does not exist.</p>
             <Link href="/dashboard" className="mt-6">
                <Button variant="secondary">Back to Dashboard</Button>
             </Link>
          </div>
        )}
      </main>
    </div>
  );
}
