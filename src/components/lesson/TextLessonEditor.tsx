import React from 'react';
import RichTextEditor from '../RichTextEditor';

export interface TextLessonEditorProps {
  content: string;
  onContentChange: (content: string) => void;
}

export default function TextLessonEditor({ content, onContentChange }: TextLessonEditorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Lesson Content
      </label>
      <RichTextEditor
        value={content}
        onChange={onContentChange}
        placeholder="Start writing lesson content..."
      />
    </div>
  );
}


