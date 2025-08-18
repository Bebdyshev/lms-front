import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchAssignmentsByLecture, fetchLectureById, submitAssignment, getAssignmentStatusForStudent, uploadSubmissionFile, getFileUrl } from "../services/api";
import { toast } from '../components/Toast.tsx';
import FileUpload from '../components/FileUpload';
import { Calendar, Clock, AlertCircle, Download } from 'lucide-react';
import type { Assignment, AssignmentStatus } from '../types';


export default function AssignmentPage() {
  const { id } = useParams<{ id: string }>();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [lectureTitle, setLectureTitle] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [status, setStatus] = useState<AssignmentStatus | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      
      const lectures = ['lec-1', 'lec-2'];
      for (const lecId of lectures) {
        const list = await fetchAssignmentsByLecture(lecId);
        const a = list.find(x => x.id === id);
        if (a) {
          setAssignment(a);
          const lec = await fetchLectureById(lecId);
          setLectureTitle(lec?.title || '');
          break;
        }
      }
    }
    load();
    if (id) {
      const statusResult = getAssignmentStatusForStudent(id);
      // Convert string result to proper status object for backwards compatibility
      if (typeof statusResult === 'string') {
        setStatus({ status: statusResult, attemptsLeft: 3, late: false });
      } else {
        setStatus(statusResult);
      }
    }
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
      const result = await uploadSubmissionFile(id, selectedFile);
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
        const result = await uploadSubmissionFile(id, selectedFile);
        fileUrl = result.file_url;
        fileName = result.filename;
      }

      // Submit assignment
      await submitAssignment(id, { 
        text,
        file_url: fileUrl,
        submitted_file_name: fileName
      });
      
      setSubmitted(true);
      setUploadedFileUrl(fileUrl);
      setUploadedFileName(fileName);
      setSelectedFile(null);
      
      const statusResult = getAssignmentStatusForStudent(id);
      // Convert string result to proper status object for backwards compatibility
      if (typeof statusResult === 'string') {
        setStatus({ status: statusResult, attemptsLeft: 3, late: false });
      } else {
        setStatus(statusResult);
      }
      toast('Assignment submitted', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      toast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!assignment) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{assignment.title}</h1>
      <div className="text-gray-600">Lecture: {lectureTitle}</div>
      
      {/* Due Date and Status */}
      <div className="flex items-center space-x-4 text-sm">
        {assignment.due_date && (
          <div className={`flex items-center space-x-1 ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
            <Calendar className="w-4 h-4" />
            <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
            {isOverdue && <AlertCircle className="w-4 h-4" />}
          </div>
        )}
        {status && (
          <div className="flex items-center space-x-1 text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Status: {status.status}</span>
            <span>· Attempts left: {status.attemptsLeft}</span>
            {status.late && <span className="text-red-600">· Late</span>}
          </div>
        )}
      </div>

      <p className="text-gray-700">{assignment.description}</p>

      {/* Assignment File */}
      {assignment.file_url && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Download className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Assignment File</p>
                <p className="text-xs text-gray-600">Download the assignment file</p>
              </div>
            </div>
            <a
              href={getFileUrl('assignments', assignment.file_url.split('/').pop() || '')}
              download
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Download
            </a>
          </div>
        </div>
      )}

      <div className="bg-white p-5 rounded-xl shadow">
        {submitted ? (
          <div className="text-green-700 font-medium">Submission received. You can resubmit once if needed.</div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Text Answer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Answer</label>
              <textarea
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={6}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Type your answer or paste a link"
              />
            </div>

            {/* File Upload */}
            {(assignment.allowed_file_types && assignment.allowed_file_types.length > 0) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload File (Optional)
                </label>
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

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isSubmitting || isOverdue}
              className={`px-4 py-2 rounded-lg text-white ${
                isSubmitting || isOverdue
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? 'Submitting...' : isOverdue ? 'Assignment Overdue' : 'Submit'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}


