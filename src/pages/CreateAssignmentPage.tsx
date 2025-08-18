import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import FileUpload from '../components/FileUpload';
import { toast } from '../components/Toast';
import { Calendar, Users, BookOpen, Upload } from 'lucide-react';
import type { Group } from '../types';

interface CreateAssignmentForm {
  title: string;
  description: string;
  assignment_type: string;
  content: any;
  max_score: number;
  time_limit_minutes?: number;
  due_date?: string;
  group_id?: number;
  allowed_file_types: string[];
  max_file_size_mb: number;
}

export default function CreateAssignmentPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const [form, setForm] = useState<CreateAssignmentForm>({
    title: '',
    description: '',
    assignment_type: 'free_text',
    content: {},
    max_score: 100,
    time_limit_minutes: undefined,
    due_date: undefined,
    group_id: undefined,
    allowed_file_types: ['pdf', 'docx', 'doc', 'jpg', 'png', 'gif', 'txt'],
    max_file_size_mb: 10
  });

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const groupsData = await apiClient.getGroups();
      setGroups(groupsData);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const handleInputChange = (field: keyof CreateAssignmentForm, value: any) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    setUploadedFileUrl('');
    setUploadedFileName('');
  };

  const uploadAssignmentFile = async () => {
    if (!selectedFile) return;

    try {
      // Create assignment first to get ID
      const assignmentData = {
        ...form,
        content: form.content || {}
      };
      
      const assignment = await apiClient.createAssignment(assignmentData);
      
      // Upload file
      const result = await apiClient.uploadAssignmentFile(assignment.id, selectedFile);
      setUploadedFileUrl(result.file_url);
      setUploadedFileName(result.filename);
      setSelectedFile(null);
      
      toast('Assignment created with file successfully', 'success');
      navigate(`/assignment/${assignment.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create assignment';
      toast(errorMessage, 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const assignmentData = {
        ...form,
        content: form.content || {}
      };

      const assignment = await apiClient.createAssignment(assignmentData);
      
      // Upload file if selected
      if (selectedFile) {
        await apiClient.uploadAssignmentFile(assignment.id, selectedFile);
      }

      toast('Assignment created successfully', 'success');
      navigate('/assignments');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create assignment';
      toast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const assignmentTypes = [
    { value: 'free_text', label: 'Free Text', description: 'Open-ended text response' },
    { value: 'single_choice', label: 'Single Choice', description: 'Multiple choice with one correct answer' },
    { value: 'multiple_choice', label: 'Multiple Choice', description: 'Multiple choice with multiple correct answers' },
    { value: 'file_upload', label: 'File Upload', description: 'Submit files as answers' },
    { value: 'fill_in_blanks', label: 'Fill in the Blanks', description: 'Complete missing words in text' },
    { value: 'matching', label: 'Matching', description: 'Match items from two columns' }
  ];

  const fileTypes = [
    { value: 'pdf', label: 'PDF' },
    { value: 'docx', label: 'DOCX' },
    { value: 'doc', label: 'DOC' },
    { value: 'jpg', label: 'JPG' },
    { value: 'png', label: 'PNG' },
    { value: 'gif', label: 'GIF' },
    { value: 'txt', label: 'TXT' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create Assignment</h1>
        <button
          onClick={() => navigate('/assignments')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          ← Back to Assignments
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <BookOpen className="w-5 h-5 mr-2" />
            Basic Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assignment Title *
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter assignment title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assignment Type *
              </label>
              <select
                value={form.assignment_type}
                onChange={(e) => handleInputChange('assignment_type', e.target.value)}
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {assignmentTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter assignment description"
            />
          </div>
        </div>

        {/* Assignment Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Assignment Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Score
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={form.max_score}
                onChange={(e) => handleInputChange('max_score', parseInt(e.target.value))}
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Limit (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={form.time_limit_minutes || ''}
                onChange={(e) => handleInputChange('time_limit_minutes', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="datetime-local"
                value={form.due_date || ''}
                onChange={(e) => handleInputChange('due_date', e.target.value)}
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Group Assignment */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Assign to Group
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Group (Optional)
            </label>
            <select
              value={form.group_id || ''}
              onChange={(e) => handleInputChange('group_id', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No specific group</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.student_count} students)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* File Upload Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            File Upload Settings
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allowed File Types
              </label>
              <div className="space-y-2">
                {fileTypes.map(fileType => (
                  <label key={fileType.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.allowed_file_types.includes(fileType.value)}
                      onChange={(e) => {
                        const newTypes = e.target.checked
                          ? [...form.allowed_file_types, fileType.value]
                          : form.allowed_file_types.filter(t => t !== fileType.value);
                        handleInputChange('allowed_file_types', newTypes);
                      }}
                      className="mr-2"
                    />
                    {fileType.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max File Size (MB)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={form.max_file_size_mb}
                onChange={(e) => handleInputChange('max_file_size_mb', parseInt(e.target.value))}
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Assignment File */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Assignment File (Optional)</h2>
          
          <FileUpload
            onFileSelect={handleFileSelect}
            onFileRemove={handleFileRemove}
            selectedFile={selectedFile}
            uploadedFileUrl={uploadedFileUrl}
            uploadedFileName={uploadedFileName}
            allowedTypes={['pdf', 'docx', 'doc', 'jpg', 'png', 'gif', 'txt']}
            maxSizeMB={10}
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/assignments')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-2 rounded-lg text-white ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Creating...' : 'Create Assignment'}
          </button>
        </div>
      </form>
    </div>
  );
}
