import React, { useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Start writing lesson content...",
  className = ""
}) => {
  const quillRef = useRef<ReactQuill>(null);

  // Auto-resize functionality
  useEffect(() => {
    const adjustHeight = () => {
      if (quillRef.current) {
        const quill = quillRef.current.getEditor();
        const editor = quill.root;
        const toolbar = quill.getModule('toolbar').container;
        
        // Reset height to auto to get the correct scroll height
        editor.style.height = 'auto';
        
        // Calculate new height based on content
        const contentHeight = editor.scrollHeight;
        const minHeight = 300;
        const maxHeight = 800;
        
        // Set height within bounds
        const newHeight = Math.max(minHeight, Math.min(contentHeight, maxHeight));
        editor.style.height = `${newHeight}px`;
      }
    };

    // Adjust height when value changes
    adjustHeight();
    
    // Also adjust on window resize
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, [value]);

  // Конфигурация модулей для toolbar
  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'size': [] }],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    }
  };

  // Форматы для toolbar
  const formats = [
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'font', 'size',
    'align',
    'list', 'bullet',
    'indent',
    'blockquote', 'code-block',
    'link', 'image',
    'clean'
  ];

  return (
    <div className={`rich-text-editor ${className}`}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{ minHeight: '200px', maxHeight: '800px' }}
      />
    </div>
  );
};

export default RichTextEditor;
