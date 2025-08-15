/**
 * YouTube URL validation and video ID extraction utilities
 * Supports various YouTube URL formats
 */

export interface YouTubeVideoInfo {
  is_valid: boolean;
  video_id?: string;
  clean_url?: string;
  embed_url?: string;
  thumbnail_url?: string;
}

/**
 * Extract video ID from various YouTube URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  // Patterns for various YouTube URL formats
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:m\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Validate YouTube URL and extract video information
 */
export function validateAndExtractYouTubeInfo(url: string): YouTubeVideoInfo {
  const videoId = extractYouTubeVideoId(url);

  if (!videoId) {
    return { is_valid: false };
  }

  // Generate various URL formats
  const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&fs=0&disablekb=1&iv_load_policy=3&cc_load_policy=0`;
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  return {
    is_valid: true,
    video_id: videoId,
    clean_url: cleanUrl,
    embed_url: embedUrl,
    thumbnail_url: thumbnailUrl,
  };
}

/**
 * Check if a string is a valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  return validateAndExtractYouTubeInfo(url).is_valid;
}

/**
 * Get supported YouTube URL formats for reference
 */
export function getSupportedYouTubeFormats(): string[] {
  return [
    "https://www.youtube.com/watch?v=VIDEO_ID",
    "https://youtu.be/VIDEO_ID",
    "https://www.youtube.com/embed/VIDEO_ID",
    "https://m.youtube.com/watch?v=VIDEO_ID",
    "www.youtube.com/watch?v=VIDEO_ID",
    "youtu.be/VIDEO_ID"
  ];
}
