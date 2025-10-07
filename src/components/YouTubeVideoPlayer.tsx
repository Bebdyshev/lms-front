import { useState, useEffect, useRef } from 'react';
import { validateAndExtractYouTubeInfo } from '../utils/youtube';

interface YouTubeVideoPlayerProps {
  url: string;
  title?: string;
  className?: string;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
}

export default function YouTubeVideoPlayer({ 
  url, 
  title = "YouTube Video", 
  className = "",
  onError,
  onProgress 
}: YouTubeVideoPlayerProps) {
  const [iframeError, setIframeError] = useState(false);
  const [player, setPlayer] = useState<any>(null);
  const [isYouTubeAPIReady, setIsYouTubeAPIReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number>();
  const videoInfo = validateAndExtractYouTubeInfo(url);

  if (!videoInfo.is_valid || !videoInfo.video_id) {
    const errorMessage = "Invalid YouTube URL";
    onError?.(errorMessage);
    return (
      <div className={`bg-gray-100 rounded-lg p-4 text-center ${className}`}>
        <div className="text-gray-500 text-sm">
          <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p>{errorMessage}</p>
          <p className="text-xs mt-1">Please enter a valid YouTube URL</p>
        </div>
      </div>
    );
  }

  const handleIframeError = () => {
    setIframeError(true);
  };

  const openInNewWindow = () => {
    window.open(videoInfo.clean_url, '_blank', 'noopener,noreferrer');
  };

  // Initialize YouTube Player API
  useEffect(() => {
    if (!videoInfo.is_valid || !videoInfo.video_id) {
      console.log('YouTubeVideoPlayer: Invalid video info', videoInfo);
      return;
    }

    console.log('YouTubeVideoPlayer: Initializing for video', videoInfo.video_id);

    const loadYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        console.log('YouTubeVideoPlayer: YouTube API already loaded');
        setIsYouTubeAPIReady(true);
        initializePlayer();
      } else {
        console.log('YouTubeVideoPlayer: Loading YouTube API...');
        // Load YouTube API if not already loaded
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
          console.log('YouTubeVideoPlayer: YouTube API ready');
          setIsYouTubeAPIReady(true);
          initializePlayer();
        };
      }
    };

    const initializePlayer = () => {
      console.log('YouTubeVideoPlayer: initializePlayer called');
      console.log('YouTubeVideoPlayer: playerRef.current:', !!playerRef.current);
      console.log('YouTubeVideoPlayer: window.YT:', !!window.YT);
      console.log('YouTubeVideoPlayer: player:', !!player);
      
      // Wait for element to be rendered
      if (!playerRef.current) {
        console.log('YouTubeVideoPlayer: playerRef not ready, retrying in 100ms...');
        setTimeout(initializePlayer, 100);
        return;
      }
      
      if (playerRef.current && window.YT) {
        console.log('YouTubeVideoPlayer: Creating YouTube Player...');
        try {
          new window.YT.Player(playerRef.current as any, {
            videoId: videoInfo.video_id,
            playerVars: {
              autoplay: 0,
              modestbranding: 1,
              rel: 0
            },
            events: {
              onReady: (event: any) => {
                console.log('YouTubeVideoPlayer: Player ready');
                setPlayer(event.target);
              },
              onStateChange: (event: any) => {
                console.log('YouTubeVideoPlayer: State changed to', event.data);

                if (event.data === window.YT.PlayerState.PLAYING) {
                  console.log('YouTubeVideoPlayer: Video started playing, starting progress tracking');
                  // Clear any existing interval first
                  if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                  }
                  
                  // Start new progress tracking
                  intervalRef.current = window.setInterval(() => {
                    try {
                      if (event.target && event.target.getCurrentTime && event.target.getDuration) {
                        const currentTime = event.target.getCurrentTime();
                        const duration = event.target.getDuration();
                        if (duration > 0) {
                          const progressFraction = Math.min(1, Math.max(0, currentTime / duration));
                          const progressPercent = progressFraction * 100;
                          console.log('YouTubeVideoPlayer: Progress update', progressPercent.toFixed(1) + '%');
                          onProgress?.(progressFraction);
                        }
                      }
                    } catch (err) {
                      console.error('YouTubeVideoPlayer: Error while tracking progress', err);
                    }
                  }, 1000);

                } else if (event.data === window.YT.PlayerState.PAUSED) {
                  console.log('YouTubeVideoPlayer: Video paused');
                  // Keep the interval running when paused to maintain progress
                } else if (event.data === window.YT.PlayerState.ENDED) {
                  // Clear interval and report 100%
                  console.log('YouTubeVideoPlayer: Video ended, reporting 100% progress');
                  if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = undefined;
                  }
                  onProgress?.(1);
                } else if (event.data === window.YT.PlayerState.ENDED) {
                  console.log('YouTubeVideoPlayer: Video ended, reporting 100% progress');
                  onProgress?.(1);
                }
              }
            }
          });

          console.log('YouTubeVideoPlayer: Player created successfully');
        } catch (error) {
          console.error('YouTubeVideoPlayer: Error creating player', error);
        }
      } else {
        console.log('YouTubeVideoPlayer: Cannot initialize - playerRef:', !!playerRef.current, 'YT:', !!window.YT);
      }
    };

    loadYouTubeAPI();

    return () => {
      // Cleanup on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
      if (player) {
        try {
          player.destroy();
        } catch (err) {
          console.error('YouTubeVideoPlayer: Error destroying player', err);
        }
      }
    };
  }, [videoInfo.video_id, onProgress]);

  // Debug logging
  useEffect(() => {
    console.log('YouTubeVideoPlayer: Rendering - player:', !!player, 'playerRef:', !!playerRef.current);
  });

  // Fallback UI for Zen browser or iframe errors
  if (iframeError) {
    return (
      <div className={`bg-gray-100 rounded-lg p-4 text-center ${className}`}>
        <div className="text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
          </svg>
          <h3 className="text-lg font-medium mb-2">Видео недоступно для встраивания</h3>
          <p className="text-sm mb-4">
            Ваш браузер не поддерживает встраивание YouTube видео. 
            Нажмите кнопку ниже, чтобы открыть видео в новом окне.
          </p>
          <button
            onClick={openInNewWindow}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Открыть видео на YouTube
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg overflow-hidden relative youtube-iframe-container ${className}`}>
      {/* Educational overlay */}
      <div className="aspect-video w-full">
        {/* Always render playerRef div for YouTube API initialization */}
        <div ref={playerRef} className="w-full h-full" />
        
        {/* Fallback iframe when YouTube API is not ready */}
        {!player && (
          <iframe
            ref={iframeRef}
            src={videoInfo.embed_url}
            className="w-full h-full youtube-iframe"
            allowFullScreen={false}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            onError={handleIframeError}
          />
        )}
        {/* Debug info - removed console.log from JSX */}
      </div>
      
      {/* Warning overlay on hover */}
      <div className="absolute inset-0 bg-transparent hover:bg-black hover:bg-opacity-10 transition-all duration-200 pointer-events-none">
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity duration-200">
          Видео воспроизводится в учебных целях
        </div>
      </div>

      {/* Fallback button for Zen browser */}
      <div className="absolute top-2 right-2">
        <button
          onClick={openInNewWindow}
          className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded hover:bg-opacity-90 transition-all duration-200 opacity-0 hover:opacity-100"
          title="Открыть в новом окне"
        >
          ↗
        </button>
      </div>
    </div>
  );
}
