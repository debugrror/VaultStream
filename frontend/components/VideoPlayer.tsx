'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { AlertCircle, Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
}

export default function VideoPlayer({ src, poster, autoPlay = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dynamically import Plyr and its CSS (client-side only)
    const loadPlyr = async () => {
      const Plyr = (await import('plyr')).default;
      await import('plyr/dist/plyr.css');
      return Plyr;
    };

    if (!src || !videoRef.current) return;

    const video = videoRef.current;
    let player: any = null;

    const initPlayer = async () => {
      try {
        // Load Plyr first
        const Plyr = await loadPlyr();

        // Initialize HLS first to get quality levels
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
          });

          hls.loadSource(src);
          hls.attachMedia(video);

          // Wait for manifest to be parsed to get quality levels
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            // Get quality levels from HLS
            const levels = hls.levels;
            
            // Create quality options with proper labels
            const qualityOptions: { [key: number]: string } = {};
            levels.forEach((level, index) => {
              qualityOptions[index] = `${level.height}p`;
            });
            qualityOptions[-1] = 'Auto';

            // Initialize Plyr with quality options
            player = new Plyr(video, {
              controls: [
                'play-large',
                'play',
                'progress',
                'current-time',
                'duration',
                'mute',
                'volume',
                'settings',
                'pip',
                'fullscreen',
              ],
              settings: ['quality', 'speed'],
              quality: {
                default: -1, // Auto
                options: [-1, ...levels.map((_, index) => index)],
                forced: true,
                onChange: (newQuality: number) => {
                  if (newQuality === -1) {
                    // Auto quality
                    hls.currentLevel = -1;
                  } else {
                    // Manual quality
                    hls.currentLevel = newQuality;
                  }
                },
              },
              i18n: {
                qualityLabel: qualityOptions,
              },
              speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
              keyboard: { focused: true, global: true },
              tooltips: { controls: true, seek: true },
              hideControls: true,
              resetOnEnd: true,
            });

            playerRef.current = player;

            setLoading(false);
            if (autoPlay) {
              video.play().catch(err => console.error('Autoplay failed:', err));
            }
          });

          hls.on(Hls.Events.ERROR, (_event, data) => {
            console.error('HLS Error:', data);
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.log('Network error, attempting recovery...');
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.log('Media error, attempting recovery...');
                  hls.recoverMediaError();
                  break;
                default:
                  setError('Unable to load video. Please try again.');
                  hls.destroy();
                  setLoading(false);
                  break;
              }
            }
          });

          hlsRef.current = hls;

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support (Safari) - no quality switching
          video.src = src;
          
          player = new Plyr(video, {
            controls: [
              'play-large',
              'play',
              'progress',
              'current-time',
              'duration',
              'mute',
              'volume',
              'settings',
              'pip',
              'fullscreen',
            ],
            settings: ['speed'],
            speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
            keyboard: { focused: true, global: true },
            tooltips: { controls: true, seek: true },
            hideControls: true,
            resetOnEnd: true,
          });

          playerRef.current = player;

          video.addEventListener('loadedmetadata', () => {
            setLoading(false);
            if (autoPlay) {
              video.play().catch(err => console.error('Autoplay failed:', err));
            }
          });
        } else {
          setError('HLS is not supported in this browser.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to initialize player:', err);
        setError('Failed to initialize video player.');
        setLoading(false);
      }
    };

    initPlayer();

    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [src, autoPlay]);

  if (error) {
    return (
      <div className="relative w-full aspect-video flex items-center justify-center bg-black rounded-lg overflow-hidden">
        <div className="text-center p-8">
          <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Playback Error</h3>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading video...</p>
          </div>
        </div>
      )}
      
      <video
        ref={videoRef}
        className="plyr-react plyr w-full h-full"
        poster={poster}
        playsInline
        crossOrigin="anonymous"
      />
    </div>
  );
}
