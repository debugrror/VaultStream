'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import VideoPlayer from '@/components/VideoPlayer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import api from '@/lib/axios';
import { Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface VideoData {
  videoId: string;
  title: string;
  description: string;
  visibility: string;
  views: number;
  userId: string;
  createdAt: string;
  streamUrl?: string;
}

export default function WatchPage() {
  const { videoId } = useParams();
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPassphrase, setNeedsPassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [accessError, setAccessError] = useState<string | null>(null);

  const fetchVideo = async (pwd?: string) => {
    try {
      setLoading(true);
      setAccessError(null);
      
      const response = await api.post(`/videos/${videoId}/access`, {
        passphrase: pwd,
      });

      if (response.data.success) {
        setVideo(response.data.data);
        setNeedsPassphrase(false);
      }
    } catch (error: any) {
      const code = error.response?.data?.error?.code; 
      
      if (code === 'PASSPHRASE_REQUIRED') {
        setNeedsPassphrase(true);
      } else if (code === 'INVALID_PASSPHRASE') {
        setNeedsPassphrase(true);
        setAccessError('Invalid passphrase');
      } else if (code === 'ACCESS_DENIED') {
        setAccessError('This video is private.');
      } else {
        setAccessError('Failed to load video.');
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (videoId) {
      fetchVideo();
    }
  }, [videoId]);

  const handlePassphraseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVideo(passphrase);
  };

  if (loading && !video && !needsPassphrase) {
     return (
        <div className="min-h-screen bg-gray-50">
           <Navbar />
           <div className="flex h-[calc(100vh-64px)] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
           </div>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
             {accessError && !needsPassphrase ? (
                <div className="aspect-video flex items-center justify-center rounded-lg bg-gray-900 text-white">
                   <div className="text-center">
                      <Lock className="mx-auto h-12 w-12 text-gray-500 mb-2" />
                      <p>{accessError}</p>
                   </div>
                </div>
             ) : needsPassphrase ? (
                <div className="aspect-video flex items-center justify-center rounded-lg bg-black text-white p-6">
                   <div className="w-full max-w-sm text-center">
                      <Lock className="mx-auto h-12 w-12 text-blue-500 mb-4" />
                      <h3 className="text-xl font-bold mb-2">Protected Video</h3>
                      <p className="text-gray-400 mb-6">Enter passphrase to unlock.</p>
                      
                      <form onSubmit={handlePassphraseSubmit} className="space-y-4">
                         <Input 
                            type="password" 
                            placeholder="Passphrase" 
                            value={passphrase}
                            onChange={(e) => setPassphrase(e.target.value)}
                            className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                         />
                         {accessError && <p className="text-red-500 text-sm">{accessError}</p>}
                         <Button type="submit" className="w-full">Unlock</Button>
                      </form>
                   </div>
                </div>
             ) : `${process.env.NEXT_PUBLIC_API_BASE_URL}${video?.streamUrl}` ? (
                <VideoPlayer src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${video?.streamUrl}`} poster={undefined} autoPlay />
             ) : null}

             {video && !needsPassphrase && (
                <div className="space-y-4">
                   <h1 className="text-2xl font-bold text-gray-900">{video.title}</h1>
                   <div className="flex items-center justify-between border-b pb-4">
                      
                      <div className="flex items-center space-x-2">
                         <div className="bg-gray-200 rounded-full p-2">
                            <User className="w-5 h-5 text-gray-600" />
                         </div>
                         <div className="text-sm">
                            <p className="font-medium text-gray-900">Uploader: {video.userId?.substring(0,8) || 'Unknown'}...</p> 
                            <p className="text-gray-500">{new Date(video.createdAt).toLocaleDateString()}</p>
                         </div>
                      </div>

                      <div className="text-sm text-gray-500">
                         {video.views} views
                      </div>
                   </div>
                   
                   <Card>
                      <CardContent className="pt-6">
                         <p className="text-gray-700 whitespace-pre-wrap">{video.description || "No description provided."}</p>
                      </CardContent>
                   </Card>
                </div>
             )}
          </div>
          
          <div className="hidden lg:block">
             <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-center text-sm text-gray-500">Up Next</p>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
