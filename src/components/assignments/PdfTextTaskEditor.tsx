import { useState, useEffect } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface PdfTextTaskEditorProps {
  content: any;
  onContentChange: (content: any) => void;
}

// Supported file types for document + text task
const SUPPORTED_FILE_TYPES = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif'];
const SUPPORTED_EXTENSIONS_DISPLAY = 'PDF, DOC, DOCX, JPG, PNG, GIF';

export default function PdfTextTaskEditor({ content, onContentChange }: PdfTextTaskEditorProps) {
  const [question, setQuestion] = useState(content.question || '');
  const [maxLength, setMaxLength] = useState(content.max_length || 2000);
  const [keywords, setKeywords] = useState(content.keywords?.join(', ') || '');
  const [teacherFile, setTeacherFile] = useState<File | null>(content.teacher_file || null);
  const [teacherFileName, setTeacherFileName] = useState(content.teacher_file_name || '');

  // Sync state with props when content loads asynchronously
  useEffect(() => {
    if (content.question && !question) setQuestion(content.question);
    if (content.max_length && maxLength === 2000) setMaxLength(content.max_length);
    if (content.keywords && !keywords) setKeywords(content.keywords.join(', '));
    if (content.teacher_file_name && !teacherFileName) setTeacherFileName(content.teacher_file_name);
  }, [content]);

  useEffect(() => {
    onContentChange({
      question,
      max_length: maxLength,
      keywords: keywords ? keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k) : [],
      teacher_file: teacherFile,
      teacher_file_name: teacherFileName,
      teacher_file_url: content.teacher_file_url // Preserve existing URL
    });
  }, [question, maxLength, keywords, teacherFile, teacherFileName]);

  const handleTeacherFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const fileName = file.name.toLowerCase();
      const isValidType = SUPPORTED_FILE_TYPES.some(ext => fileName.endsWith(ext));
      if (!isValidType) {
        alert(`Please upload a supported file type: ${SUPPORTED_EXTENSIONS_DISPLAY}`);
        return;
      }
      setTeacherFile(file);
      setTeacherFileName(file.name);
    }
  };

  const removeTeacherFile = () => {
    setTeacherFile(null);
    setTeacherFileName('');
    onContentChange({
      ...content,
      teacher_file_url: null,
      teacher_file_name: null,
      teacher_file: null
    });
  };

  const uniqueId = `teacher-file-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-4">
      {/* File Upload Section */}
      <div>
        <Label className="mb-2">Reference File for Student *</Label>
        <div className="space-y-2">
          {content.teacher_file_url ? (
            // Display existing uploaded file
            <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 border-blue-200">
              <div className="flex items-center space-x-2 flex-1">
                <FileText className="w-4 h-4 text-blue-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-blue-900">{content.teacher_file_name || 'File'}</span>
                  <a 
                    href={(import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000') + content.teacher_file_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View/Download File
                  </a>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeTeacherFile}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ) : teacherFile ? (
            // Display newly selected file (not yet uploaded)
            <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">{teacherFileName}</span>
                <span className="text-xs text-gray-500">
                  ({(teacherFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeTeacherFile}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            // No file selected - show upload area
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                id={uniqueId}
                onChange={handleTeacherFileUpload}
                className="hidden"
                accept={SUPPORTED_FILE_TYPES.join(',')}
              />
              <label htmlFor={uniqueId} className="cursor-pointer">
                <div className="flex flex-col items-center space-y-2">
                  <FileText className="w-8 h-8 text-gray-400" />
                  <div>
                    <span className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      Click to upload a file
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Supported: {SUPPORTED_EXTENSIONS_DISPLAY}
                    </p>
                  </div>
                </div>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Question/Instructions */}
      <div>
        <Label htmlFor="pdf-text-question">Question/Instructions for Student *</Label>
        <Textarea
          id="pdf-text-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="E.g.: Read the document and answer the question..."
          rows={3}
        />
      </div>

      {/* Max Length */}
      <div>
        <Label htmlFor="pdf-text-max-length">Maximum Response Length (characters)</Label>
        <Input
          id="pdf-text-max-length"
          type="number"
          value={maxLength}
          onChange={(e) => setMaxLength(parseInt(e.target.value) || 2000)}
          min="100"
          max="10000"
        />
      </div>

      {/* Keywords for Auto-Grading */}
      <div>
        <Label htmlFor="pdf-text-keywords">Keywords for Grading (optional)</Label>
        <Input
          id="pdf-text-keywords"
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="keyword1, keyword2, keyword3"
        />
        <p className="text-xs text-gray-500 mt-1">
          Comma-separated. These words will be used for auto-grading the student's response.
        </p>
      </div>
    </div>
  );
}
