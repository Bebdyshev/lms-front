import React from 'react';
import YouTubeVideoPlayer from '../YouTubeVideoPlayer';
import RichTextEditor from '../RichTextEditor';

export interface VideoLessonEditorProps {
  lessonTitle: string;
  videoUrl: string;
  videoError?: string | null;
  onVideoUrlChange: (url: string) => void;
  onClearUrl: () => void;
  onVideoError?: (error: string) => void;
  content: string;
  onContentChange: (content: string) => void;
}

export default function VideoLessonEditor({
  lessonTitle,
  videoUrl,
  videoError,
  onVideoUrlChange,
  onClearUrl,
  onVideoError,
  content,
  onContentChange,
}: VideoLessonEditorProps) {
  return (
    <div className="space-y-6">
      {videoUrl && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video Preview
          </label>
          <YouTubeVideoPlayer
            url={videoUrl}
            title={lessonTitle || 'Lesson Video'}
            className="w-full"
            onError={onVideoError}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Video URL (YouTube)
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => onVideoUrlChange(e.target.value)}
            className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              videoError ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <button
            onClick={onClearUrl}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
        {videoError && (
          <p className="text-sm text-red-600 mt-1">{videoError}</p>
        )}
        <p className="text-sm text-gray-500 mt-1">
          Paste a YouTube video URL to embed it in the lesson
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Video Lesson Content
        </label>
        <RichTextEditor
          value={content}
          onChange={onContentChange}
          placeholder="Add description, notes, or additional content for this video lesson..."
        />
        <p className="text-sm text-gray-500 mt-1">
          Add text content to accompany the video (optional)
        </p>
      </div>
    </div>
  );
}


