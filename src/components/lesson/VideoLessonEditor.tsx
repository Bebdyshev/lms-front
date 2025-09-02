import React from 'react';
import YouTubeVideoPlayer from '../YouTubeVideoPlayer';
import RichTextEditor from '../RichTextEditor';
import { Input } from '../ui/input';

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
          {/* Browser compatibility warning */}
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-blue-700">
                <p className="font-medium">Совместимость браузеров</p>
                <p className="mt-1">
                  Некоторые браузеры (например, Zen) могут блокировать встраивание YouTube видео. 
                  В этом случае появится кнопка для открытия видео в новом окне.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Video URL (YouTube)
        </label>
        <div className="flex gap-2 p-1">
          <Input
            type="url"
            value={videoUrl}
            onChange={(e) => onVideoUrlChange(e.target.value)}
            className="flex-1"
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


