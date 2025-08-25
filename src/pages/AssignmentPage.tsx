import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from "../services/api";
import { toast } from '../components/Toast.tsx';
import FileUpload from '../components/FileUpload';
import { Calendar, Clock, AlertCircle, Download, Upload, Send, FileText, Award, File, CheckCircle, XCircle, MessageSquare, Star } from 'lucide-react';
import type { Assignment, AssignmentStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// shadcn/ui components
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';

export default function AssignmentPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [text, setText] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [status, setStatus] = useState<AssignmentStatus | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      
      console.log('Loading assignment with ID:', id);
      
      try {
        const assignmentData = await apiClient.getAssignment(id);
        console.log('Assignment data loaded:', assignmentData);
        setAssignment(assignmentData);
        
        // Load assignment status
        const statusResult = await apiClient.getAssignmentStatusForStudent(id);
        console.log('Assignment status loaded:', statusResult);
        setStatus(statusResult as AssignmentStatus);
        setSubmitted(statusResult.status === 'graded' || statusResult.status === 'submitted');
      } catch (error) {
        console.error('Failed to load assignment:', error);
        toast('Failed to load assignment', 'error');
      }
    }
    load();
  }, [id]);

  const isOverdue = assignment?.due_date && new Date(assignment.due_date) < new Date();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    setUploadedFileUrl('');
    setUploadedFileName('');
  };

  const uploadFile = async () => {
    if (!selectedFile || !id) return;

    try {
      const result = await apiClient.uploadSubmissionFile(id, selectedFile);
      setUploadedFileUrl(result.file_url);
      setUploadedFileName(result.filename);
      setSelectedFile(null);
      toast('File uploaded successfully', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
      toast(errorMessage, 'error');
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    setIsSubmitting(true);
    
    try {
      // Upload file first if selected
      let fileUrl = uploadedFileUrl;
      let fileName = uploadedFileName;
      
      if (selectedFile) {
        const result = await apiClient.uploadSubmissionFile(id, selectedFile);
        fileUrl = result.file_url;
        fileName = result.filename;
      }

      // Submit assignment
      await apiClient.submitAssignment(id, { 
        text,
        file_url: fileUrl,
        submitted_file_name: fileName
      });
      
      setSubmitted(true);
      setUploadedFileUrl(fileUrl);
      setUploadedFileName(fileName);
      setSelectedFile(null);
      setIsModalOpen(false);
      
      // Update assignment status after submission
      try {
        const statusResult = await apiClient.getAssignmentStatusForStudent(id);
        setStatus(statusResult as AssignmentStatus);
        console.log('Status result:', statusResult);
        setSubmitted(statusResult.status === 'graded' || statusResult.status === 'submitted');
      } catch (error) {
        console.error('Failed to update assignment status:', error);
      }
      toast('Assignment submitted', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      toast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeVariant = () => {
    if (!status) return 'secondary';
    if (status.status === 'submitted') return 'default';
    if (status.status === 'graded') return 'outline';
    return 'secondary';
  };

  const getAssignmentTypeIcon = () => {
    switch (assignment?.assignment_type) {
      case 'file_upload':
        return <Upload className="w-4 h-4" />;
      case 'free_text':
      case 'essay':
        return <FileText className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  const getAssignmentTypeLabel = () => {
    switch (assignment?.assignment_type) {
      case 'file_upload':
        return 'File Upload';
      case 'free_text':
        return 'Free Text';
      case 'essay':
        return 'Essay';
      default:
        return 'Assignment';
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return '📄';
      case 'docx':
      case 'doc':
        return '📝';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return '🖼️';
      default:
        return '📎';
    }
  };

  if (!assignment) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-gray-500 text-lg">Loading assignment...</div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {getAssignmentTypeIcon()}
                </div>
                <div>
                  <Badge variant="outline" className="text-xs">
                    {getAssignmentTypeLabel()}
                  </Badge>
                  {assignment.is_active ? (
                    <Badge variant="default" className="ml-2 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      <XCircle className="w-3 h-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900">
                <div className="flex items-center justify-between w-full">
                  <span className="pr-3 truncate">{assignment.title}</span>
                  {status && status.status === 'graded' && (
                    <div className="flex items-center space-x-2 ">
                      <Award className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        Score: {status.score}/{assignment.max_score}
                      </span>
                    </div>
                  )}
                </div>
              </CardTitle>
              <CardDescription className="text-base text-gray-600">
                {assignment.description}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end space-y-2">
              {status && (
                <Badge variant={getStatusBadgeVariant()} className="text-sm">
                  {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                </Badge>
              )}
              {status?.late && (
                <Badge variant="destructive" className="text-sm">
                  Late Submission
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            {assignment.due_date && (
              <div className={`flex items-center space-x-2 ${isOverdue ? 'text-red-600' : ''}`}>
                <Calendar className="w-4 h-4" />
                <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                {isOverdue && <AlertCircle className="w-4 h-4" />}
              </div>
            )}
            {assignment.time_limit_minutes && (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Time Limit: {assignment.time_limit_minutes} minutes</span>
              </div>
            )}
            {status && (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Attempts left: {status.attemptsLeft}</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <span>Created: {new Date(assignment.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question/Content Card */}
      {assignment.content?.question && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Assignment Question</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-800 whitespace-pre-wrap">{assignment.content.question}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teacher's File Card */}
      {assignment.content?.teacher_file_name && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center space-x-2">
              <Download className="w-5 h-5" />
              <span>Assignment Materials</span>
            </CardTitle>
            <CardDescription>
              Download the provided materials for this assignment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <File className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{assignment.content.teacher_file_name}</p>
                  <p className="text-xs text-gray-600">Provided by instructor</p>
                </div>
              </div>
              {assignment.content.teacher_file_url && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a
                    href={assignment.content.teacher_file_url}
                    download
                    className="flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignment File Card (Legacy) */}
      {assignment.file_url && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Download className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Assignment File</p>
                  <p className="text-xs text-gray-600">Download the assignment file to get started</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={apiClient.getFileUrl('assignments', assignment.file_url.split('/').pop() || '')}
                  download
                  className="flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teacher Actions Section */}
      {(user?.role === 'teacher' || user?.role === 'admin') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center space-x-2">
              <Award className="w-5 h-5" />
              <span>Teacher Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate(`/assignment/${id}/grade`)}
              className="flex items-center space-x-2"
            >
              <Star className="w-4 h-4" />
              <span>Grade Submissions</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Submission Section */}
      {user?.role !== 'teacher' && user?.role !== 'admin' && !submitted && (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Submit Your Work</CardTitle>
          <CardDescription>
            {submitted 
              ? "Your submission has been received. You can resubmit if needed."
              : "Complete your assignment and submit your work below."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="flex items-center space-x-2 text-green-700 bg-green-50 p-4 rounded-lg">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span className="font-medium">Submission received successfully</span>
            </div>
          ) : (
            <div className="flex justify-center">
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="lg" 
                    disabled={!!isOverdue}
                    className="flex items-center space-x-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isOverdue ? 'Assignment Overdue' : 'Submit Assignment'}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Submit Assignment</DialogTitle>
                    <DialogDescription>
                      Complete your assignment submission. You can provide a text answer and optionally upload a file.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={onSubmit} className="space-y-6">
                    {/* Text Answer */}
                    <div className="space-y-2">
                      <Label htmlFor="answer">Your Answer</Label>
                      <Textarea
                        id="answer"
                        placeholder="Type your answer or paste a link..."
                        value={text}
                        onChange={e => setText(e.target.value)}
                        className="min-h-[120px]"
                      />
                    </div>

                    {/* File Upload */}
                    {(assignment.allowed_file_types && assignment.allowed_file_types.length > 0) && (
                      <div className="space-y-2">
                        <Label>Upload File (Optional)</Label>
                        <FileUpload
                          onFileSelect={handleFileSelect}
                          onFileRemove={handleFileRemove}
                          selectedFile={selectedFile}
                          uploadedFileUrl={uploadedFileUrl}
                          uploadedFileName={uploadedFileName}
                          allowedTypes={assignment.allowed_file_types || []}
                          maxSizeMB={assignment.max_file_size_mb || 10}
                        />
                      </div>
                    )}

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsModalOpen(false)}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center space-x-2"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Submit Assignment</span>
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}


