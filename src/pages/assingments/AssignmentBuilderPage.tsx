import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/api';
import { 
  Save, 
  Eye, 
  X, 
  Plus, 
  Trash2, 
  FileText, 
  Calendar,
  Clock,
  Award,
  BookOpen,
  Users
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';

interface AssignmentFormData {
  title: string;
  description: string;
  assignment_type: string;
  content: any;
  correct_answers: any;
  max_score: number;
  due_date?: string;
  allowed_file_types?: string[];
  max_file_size_mb?: number;
  group_id?: number;
}

const ASSIGNMENT_TYPES = [
  { value: 'file_upload', label: 'File Upload', description: 'Загрузка файла' }
];

export default function AssignmentBuilderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { groupId } = useParams();
  
  const [formData, setFormData] = useState<AssignmentFormData>({
    title: '',
    description: '',
    assignment_type: 'file_upload',
    content: {},
    correct_answers: {},
    max_score: 100,
    due_date: '',
    allowed_file_types: ['pdf', 'docx', 'doc', 'jpg', 'png'],
    max_file_size_mb: 10
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  useEffect(() => {
    loadGroups();
    if (groupId) {
      setFormData(prev => ({ ...prev, group_id: parseInt(groupId) }));
    }
  }, [groupId]);

  const loadGroups = async () => {
    try {
      setGroupsLoading(true);
      console.log('Loading teacher groups...');
      
      const teacherGroups = await apiClient.getTeacherGroups();
      console.log('Loaded teacher groups:', teacherGroups);
      
      setGroups(teacherGroups || []);
    } catch (err) {
      console.error('Failed to load groups:', err);
      setError('Failed to load groups. Please try again.');
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  };

  const handleInputChange = (field: keyof AssignmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContentChange = (content: any) => {
    setFormData(prev => ({ ...prev, content }));
  };

  const handleCorrectAnswersChange = (correct_answers: any) => {
    setFormData(prev => ({ ...prev, correct_answers }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Handle teacher file upload if present
      let teacherFileUrl = null;
      let teacherFileName = null;
      
      if (formData.content.teacher_file) {
        try {
          console.log('Uploading teacher file:', formData.content.teacher_file.name);
          
          // Upload the teacher file
          const uploadResult = await apiClient.uploadTeacherFile(formData.content.teacher_file);
          console.log('Teacher file upload result:', uploadResult);
          
          // Extract file URL and name from the response
          teacherFileUrl = uploadResult.file_url || uploadResult.url;
          teacherFileName = formData.content.teacher_file_name || formData.content.teacher_file.name;
          
          console.log('Teacher file URL:', teacherFileUrl);
          console.log('Teacher file name:', teacherFileName);
          
        } catch (fileError) {
          console.error('Failed to upload teacher file:', fileError);
          setError('Failed to upload teacher file. Please try again.');
          setLoading(false);
          return;
        }
      }

      // Create assignment data with teacher file information
      const assignmentData = {
        ...formData,
        content: {
          ...formData.content,
          teacher_file_url: teacherFileUrl,
          teacher_file_name: teacherFileName
        }
      };
      
      // Remove the actual file object before sending to API
      delete assignmentData.content.teacher_file;
      
      console.log('Creating assignment with data:', assignmentData);
      
      await apiClient.createAssignment(assignmentData);
      
      // Redirect to assignments list
      navigate('/assignments');
    } catch (err) {
      setError('Failed to create assignment. Please try again.');
      console.error('Failed to create assignment:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderAssignmentTypeEditor = () => {
    return <FileUploadEditor 
      content={formData.content} 
      correct_answers={formData.correct_answers}
      onContentChange={handleContentChange}
      onCorrectAnswersChange={handleCorrectAnswersChange}
    />;
  };

  const renderPreview = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium">{formData.title || 'Untitled Assignment'}</h4>
            <p className="text-gray-600">{formData.description || 'No description'}</p>
          </div>
          {renderAssignmentTypeEditor()}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <FileText className="w-8 h-8 mr-3 text-blue-600" />
            Create Assignment
          </h1>
          <p className="text-gray-600 mt-1">Create a new assignment for your students</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setPreviewMode(!previewMode)}
            variant={previewMode ? "default" : "outline"}
          >
            <Eye className="w-4 h-4 mr-2" />
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <X className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">
                    Assignment Title *
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter assignment title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter assignment description"
                  />
                </div>

                <div>
                  <Label htmlFor="assignment-type">
                    Assignment Type *
                  </Label>
                  <Select
                    value={formData.assignment_type}
                    onValueChange={(value) => handleInputChange('assignment_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignment type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNMENT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label} - {type.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Assignment Content */}
            {!previewMode && (
              <Card>
                <CardHeader>
                  <CardTitle>Assignment Content</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderAssignmentTypeEditor()}
                </CardContent>
              </Card>
            )}

            {/* Preview */}
            {previewMode && renderPreview()}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="max-score">
                    Max Score *
                  </Label>
                  <Input
                    id="max-score"
                    type="number"
                    value={formData.max_score}
                    onChange={(e) => handleInputChange('max_score', parseInt(e.target.value))}
                    min="1"
                    max="1000"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="due-date">
                    Due Date
                  </Label>
                  <Input
                    id="due-date"
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => handleInputChange('due_date', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Assignment Context */}
            <Card>
              <CardHeader>
                <CardTitle>Assignment Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="group">
                    Group *
                  </Label>
                  <Select
                    value={formData.group_id?.toString() || ''}
                    onValueChange={(value) => handleInputChange('group_id', value ? parseInt(value) : undefined)}
                    disabled={groupsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={groupsLoading ? "Loading groups..." : "Select a group"} />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map(group => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.name} ({group.student_count || 0} students)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {groups.length === 0 && !groupsLoading && (
                    <p className="text-sm text-gray-500 mt-1">
                      No groups found. Please create a group first.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <Button
                  type="submit"
                  disabled={loading || !formData.group_id}
                  className="w-full"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Assignment
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

// Editor Components
interface EditorProps {
  content: any;
  correct_answers: any;
  onContentChange: (content: any) => void;
  onCorrectAnswersChange: (correct_answers: any) => void;
}

function FileUploadEditor({ content, correct_answers, onContentChange, onCorrectAnswersChange }: EditorProps) {
  const [question, setQuestion] = useState(content.question || '');
  const [allowedTypes, setAllowedTypes] = useState(content.allowed_file_types || ['pdf', 'docx']);
  const [maxSize, setMaxSize] = useState(content.max_file_size_mb || 10);
  const [teacherFile, setTeacherFile] = useState<File | null>(content.teacher_file || null);
  const [teacherFileName, setTeacherFileName] = useState(content.teacher_file_name || '');

  useEffect(() => {
    onContentChange({ 
      question, 
      allowed_file_types: allowedTypes, 
      max_file_size_mb: maxSize,
      teacher_file: teacherFile,
      teacher_file_name: teacherFileName
    });
    onCorrectAnswersChange({ requires_file: true });
  }, [question, allowedTypes, maxSize, teacherFile, teacherFileName]);

  const fileTypes = [
    { value: 'pdf', label: 'PDF' },
    { value: 'docx', label: 'DOCX' },
    { value: 'doc', label: 'DOC' },
    { value: 'jpg', label: 'JPG' },
    { value: 'png', label: 'PNG' },
    { value: 'gif', label: 'GIF' },
    { value: 'txt', label: 'TXT' }
  ];

  const toggleFileType = (type: string) => {
    if (allowedTypes.includes(type)) {
      setAllowedTypes(allowedTypes.filter((t: string) => t !== type));
    } else {
      setAllowedTypes([...allowedTypes, type]);
    }
  };

  const handleTeacherFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setTeacherFile(file);
      setTeacherFileName(file.name);
    }
  };

  const removeTeacherFile = () => {
    setTeacherFile(null);
    setTeacherFileName('');
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="question-fu">Question *</Label>
        <Textarea
          id="question-fu"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Enter your question or instructions"
        />
      </div>

      <div>
        <Label className="mb-2">Teacher's File (Optional)</Label>
        <div className="space-y-2">
          {teacherFile ? (
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
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                id="teacher-file"
                onChange={handleTeacherFileUpload}
                className="hidden"
                accept={allowedTypes.map((type: string) => `.${type}`).join(',')}
              />
              <label htmlFor="teacher-file" className="cursor-pointer">
                <div className="flex flex-col items-center space-y-2">
                  <FileText className="w-8 h-8 text-gray-400" />
                  <div>
                    <span className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      Click to upload teacher's file
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Supported: {allowedTypes.map((type: string) => type.toUpperCase()).join(', ')}
                    </p>
                  </div>
                </div>
              </label>
            </div>
          )}
        </div>
      </div>

      <div>
        <Label className="mb-2">Allowed File Types for Students</Label>
        <div className="grid grid-cols-2 gap-2">
          {fileTypes.map(type => (
            <div key={type.value} className="flex items-center space-x-2">
              <Checkbox
                checked={allowedTypes.includes(type.value)}
                onCheckedChange={() => toggleFileType(type.value)}
              />
              <Label className="text-sm">{type.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="max-size">Maximum File Size (MB)</Label>
        <Input
          id="max-size"
          type="number"
          value={maxSize}
          onChange={(e) => setMaxSize(parseInt(e.target.value))}
          min="1"
          max="100"
        />
      </div>
    </div>
  );
}

