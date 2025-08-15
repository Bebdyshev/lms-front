import React from 'react';
import { validateAndExtractYouTubeInfo } from '../utils/youtube';

interface YouTubeVideoPlayerProps {
  url: string;
  title?: string;
  className?: string;
  onError?: (error: string) => void;
}

export default function YouTubeVideoPlayer({ 
  url, 
  title = "YouTube Video", 
  className = "",
  onError 
}: YouTubeVideoPlayerProps) {
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

  return (
    <div className={`bg-gray-900 rounded-lg overflow-hidden relative youtube-iframe-container ${className}`}>
      {/* Educational overlay */}
      <div className="aspect-video">
        <iframe
          src={videoInfo.embed_url}
          className="w-full h-full youtube-iframe"
          allowFullScreen={false}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
      
      {/* Warning overlay on hover */}
      <div className="absolute inset-0 bg-transparent hover:bg-black hover:bg-opacity-10 transition-all duration-200 pointer-events-none">
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity duration-200">
          Видео воспроизводится в учебных целях
        </div>
      </div>
    </div>
  );
}
