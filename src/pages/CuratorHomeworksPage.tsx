import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import Skeleton from '../components/Skeleton';
import { toast } from '../components/Toast';
import { 
  FileText, 
  Calendar, 
  Users, 
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Award,
  Eye,
  Pencil,
  X,
  Download,
  ExternalLink,
  Filter
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import MultiTaskSubmission from '../components/assignments/MultiTaskSubmission';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const buildFileUrl = (relativeUrl: string): string => {
  if (!relativeUrl) return '';
  if (relativeUrl.startsWith('http')) return relativeUrl;
  return `${API_BASE_URL}${relativeUrl}`;
};

interface HomeworkStats {
  id: number;
  title: string;
  course_title: string;
  due_date: string | null;
  max_score: number;
  total_students: number;
  submitted_count: number;
  graded_count: number;
  average_score: number;
}

interface StudentProgress {
  id: number;
  name: string;
  email: string;
  status: 'not_submitted' | 'submitted' | 'graded' | 'overdue';
  submission_id: number | null;
  score: number | null;
  max_score: number;
  submitted_at: string | null;
  graded_at: string | null;
  is_overdue: boolean;
}

interface AssignmentDetails {
  assignment: {
    id: number;
    title: string;
    description: string | null;
    due_date: string | null;
    max_score: number;
    assignment_type?: string;
    content?: any;
  };
  students: StudentProgress[];
  summary: {
    total_students: number;
    not_submitted: number;
    submitted: number;
    graded: number;
    overdue: number;
  };
}

export default function CuratorHomeworksPage() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<HomeworkStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Expanded assignment tracking
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<number | null>(null);
  const [assignmentDetails, setAssignmentDetails] = useState<AssignmentDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [studentFilter, setStudentFilter] = useState<'all' | 'not_submitted' | 'submitted' | 'graded' | 'overdue'>('all');
  
  // Grading dialog state
  const [gradingDialog, setGradingDialog] = useState<{
    open: boolean;
    submissionId: number | null;
    studentName: string;
  }>({
    open: false,
    submissionId: null,
    studentName: ''
  });
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [scoreInput, setScoreInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [loadingSubmission, setLoadingSubmission] = useState(false);
  const [savingGrade, setSavingGrade] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getCuratorAssignmentsAnalytics();
      setAssignments(data);
    } catch (error) {
      console.error('Failed to load homework analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignmentDetails = async (assignmentId: number) => {
    try {
      setLoadingDetails(true);
      const details = await apiClient.getAssignmentStudentProgress(String(assignmentId));
      setAssignmentDetails(details);
    } catch (error) {
      console.error('Failed to load assignment details:', error);
      toast('Failed to load student details', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleToggleExpand = async (assignmentId: number) => {
    if (expandedAssignmentId === assignmentId) {
      setExpandedAssignmentId(null);
      setAssignmentDetails(null);
      setStudentFilter('all');
    } else {
      setExpandedAssignmentId(assignmentId);
      setStudentFilter('all');
      await loadAssignmentDetails(assignmentId);
    }
  };

  const openGradeDialog = async (submissionId: number, studentName: string) => {
    if (!expandedAssignmentId) return;
    
    try {
      setLoadingSubmission(true);
      setGradingDialog({ open: true, submissionId, studentName });
      
      const submissions = await apiClient.getAssignmentSubmissions(String(expandedAssignmentId));
      const sub = submissions.find((s: any) => s.id === submissionId) || null;
      
      setSelectedSubmission(sub);
      setScoreInput(sub?.score != null ? String(sub.score) : '');
      setFeedbackInput(sub?.feedback || '');
    } catch (e) {
      console.error('Failed to load submission:', e);
      toast('Failed to load submission', 'error');
    } finally {
      setLoadingSubmission(false);
    }
  };

  const submitGrade = async () => {
    if (!gradingDialog.submissionId || !expandedAssignmentId) return;
    
    try {
      setSavingGrade(true);
      const parsedScore = Number(scoreInput);
      await apiClient.gradeSubmission(
        String(expandedAssignmentId), 
        String(gradingDialog.submissionId), 
        parsedScore, 
        feedbackInput
      );
      
      toast('Grade saved successfully', 'success');
      
      // Refresh assignment details
      await loadAssignmentDetails(expandedAssignmentId);
      await loadData();
      
      setGradingDialog({ open: false, submissionId: null, studentName: '' });
      setSelectedSubmission(null);
    } catch (e: any) {
      console.error('Failed to save grade:', e);
      toast(e?.message || 'Failed to save grade', 'error');
    } finally {
      setSavingGrade(false);
    }
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const fullUrl = buildFileUrl(fileUrl);
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download file:', error);
      toast('Failed to download file', 'error');
    }
  };

  const filteredAssignments = useMemo(() => 
    assignments.filter(a => 
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.course_title.toLowerCase().includes(searchTerm.toLowerCase())
    ), [assignments, searchTerm]
  );

  const filteredStudents = useMemo(() => {
    if (!assignmentDetails?.students) return [];
    if (studentFilter === 'all') return assignmentDetails.students;
    return assignmentDetails.students.filter(s => s.status === studentFilter);
  }, [assignmentDetails, studentFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'graded':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Graded
          </Badge>
        );
      case 'submitted':
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Clock className="w-3 h-3 mr-1" />
            Submitted
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Overdue
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <FileText className="w-3 h-3 mr-1" />
            Not Submitted
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Homework Performance</h1>
          <p className="text-gray-600 mt-1">
            Click on any assignment to view and grade student submissions
          </p>
        </div>
        
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search assignments..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-center p-6">
            <FileText className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No assignments found</h3>
            <p className="text-gray-500 max-w-sm mt-1">
              There are no active assignments in the courses managed by your groups.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => {
            const submissionRate = Math.round((assignment.submitted_count / (assignment.total_students || 1)) * 100);
            const isExpanded = expandedAssignmentId === assignment.id;
            const pendingCount = assignment.submitted_count - assignment.graded_count;
            
            return (
              <Collapsible 
                key={assignment.id} 
                open={isExpanded}
                onOpenChange={() => handleToggleExpand(assignment.id)}
              >
                <Card className={`transition-all duration-200 ${isExpanded ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}`}>
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-6 cursor-pointer">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        
                        {/* Assignment Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {assignment.course_title}
                            </Badge>
                            {assignment.due_date && new Date(assignment.due_date) < new Date() && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                                Deadline Passed
                              </Badge>
                            )}
                            {pendingCount > 0 && (
                              <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-1.5 py-0 h-5">
                                {pendingCount} pending review
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {assignment.title}
                          </h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1.5" />
                              {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No deadline'}
                            </div>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1.5" />
                              {assignment.total_students} students
                            </div>
                          </div>
                        </div>

                        {/* Stats & Toggle */}
                        <div className="flex items-center gap-6">
                          {/* Progress Ring */}
                          <div className="flex items-center gap-4">
                            <div className="relative w-12 h-12">
                              <svg className="w-12 h-12 transform -rotate-90">
                                <circle
                                  className="text-gray-200"
                                  strokeWidth="4"
                                  stroke="currentColor"
                                  fill="transparent"
                                  r="20"
                                  cx="24"
                                  cy="24"
                                />
                                <circle
                                  className={submissionRate >= 80 ? "text-green-500" : submissionRate >= 50 ? "text-yellow-500" : "text-red-500"}
                                  strokeWidth="4"
                                  strokeDasharray={126}
                                  strokeDashoffset={126 - (submissionRate / 100) * 126}
                                  strokeLinecap="round"
                                  stroke="currentColor"
                                  fill="transparent"
                                  r="20"
                                  cx="24"
                                  cy="24"
                                />
                              </svg>
                              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                                {submissionRate}%
                              </span>
                            </div>
                            <div className="text-sm">
                              <div className="font-semibold text-gray-900">{assignment.submitted_count}/{assignment.total_students}</div>
                              <div className="text-gray-500">submitted</div>
                            </div>
                          </div>

                          {/* Avg Score */}
                          <div className="text-center px-4 border-l border-gray-200">
                            <div className="text-xl font-bold text-gray-900">{assignment.average_score}</div>
                            <div className="text-xs text-gray-500">avg score / {assignment.max_score}</div>
                          </div>

                          {/* Expand Icon */}
                          <div className="pl-4 border-l border-gray-200">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="border-t border-gray-100">
                      {loadingDetails ? (
                        <div className="p-6 space-y-3">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Skeleton key={i} className="h-16 w-full" />
                          ))}
                        </div>
                      ) : assignmentDetails ? (
                        <div className="p-6">
                          {/* Filter Tabs */}
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className="text-sm text-gray-500 mr-2">
                              <Filter className="w-4 h-4 inline mr-1" />
                              Filter:
                            </span>
                            <Button 
                              size="sm" 
                              variant={studentFilter === 'all' ? 'default' : 'outline'}
                              onClick={() => setStudentFilter('all')}
                            >
                              All ({assignmentDetails.summary.total_students})
                            </Button>
                            <Button 
                              size="sm" 
                              variant={studentFilter === 'not_submitted' ? 'default' : 'outline'}
                              onClick={() => setStudentFilter('not_submitted')}
                              className={studentFilter !== 'not_submitted' ? 'text-gray-600' : ''}
                            >
                              Not Submitted ({assignmentDetails.summary.not_submitted})
                            </Button>
                            <Button 
                              size="sm" 
                              variant={studentFilter === 'submitted' ? 'default' : 'outline'}
                              onClick={() => setStudentFilter('submitted')}
                              className={studentFilter !== 'submitted' ? 'text-blue-600 border-blue-200' : ''}
                            >
                              Pending Review ({assignmentDetails.summary.submitted})
                            </Button>
                            <Button 
                              size="sm" 
                              variant={studentFilter === 'graded' ? 'default' : 'outline'}
                              onClick={() => setStudentFilter('graded')}
                              className={studentFilter !== 'graded' ? 'text-green-600 border-green-200' : ''}
                            >
                              Graded ({assignmentDetails.summary.graded})
                            </Button>
                            {assignmentDetails.summary.overdue > 0 && (
                              <Button 
                                size="sm" 
                                variant={studentFilter === 'overdue' ? 'default' : 'outline'}
                                onClick={() => setStudentFilter('overdue')}
                                className={studentFilter !== 'overdue' ? 'text-red-600 border-red-200' : ''}
                              >
                                Overdue ({assignmentDetails.summary.overdue})
                              </Button>
                            )}
                            
                            {/* Full Page Link */}
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => navigate(`/assignments/${assignment.id}/progress`)}
                              className="ml-auto text-blue-600"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Full View
                            </Button>
                          </div>

                          {/* Students List */}
                          <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {filteredStudents.length === 0 ? (
                              <div className="text-center py-8 text-gray-500">
                                No students match this filter
                              </div>
                            ) : (
                              filteredStudents.map((student) => (
                                <div 
                                  key={student.id}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <Avatar className="h-10 w-10 border border-gray-200">
                                      <AvatarFallback className="bg-blue-50 text-blue-600 text-sm font-medium">
                                        {student.name?.charAt(0)?.toUpperCase() || '?'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <div className="font-medium text-gray-900 truncate">{student.name}</div>
                                      <div className="text-sm text-gray-500 truncate">{student.email}</div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4">
                                    {/* Status Badge */}
                                    {getStatusBadge(student.status)}
                                    
                                    {/* Score */}
                                    {student.score !== null && (
                                      <div className="flex items-center gap-1 min-w-[60px] justify-end">
                                        <Award className="w-4 h-4 text-green-600" />
                                        <span className="font-semibold text-gray-900">
                                          {student.score}/{student.max_score}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {/* Submission Date */}
                                    {student.submitted_at && (
                                      <div className="text-xs text-gray-500 min-w-[80px] text-right">
                                        {new Date(student.submitted_at).toLocaleDateString()}
                                      </div>
                                    )}
                                    
                                    {/* Actions */}
                                    {student.submission_id && (
                                      <Button
                                        size="sm"
                                        variant={student.status === 'graded' ? 'outline' : 'default'}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openGradeDialog(student.submission_id!, student.name);
                                        }}
                                      >
                                        {student.status === 'graded' ? (
                                          <>
                                            <Eye className="w-4 h-4 mr-1" />
                                            View
                                          </>
                                        ) : (
                                          <>
                                            <Pencil className="w-4 h-4 mr-1" />
                                            Grade
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Grading Dialog */}
      <Dialog 
        open={gradingDialog.open} 
        onOpenChange={(open) => {
          if (!open) {
            setGradingDialog({ open: false, submissionId: null, studentName: '' });
            setSelectedSubmission(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Grade Submission - {gradingDialog.studentName}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGradingDialog({ open: false, submissionId: null, studentName: '' })}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4">
            {loadingSubmission ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : selectedSubmission ? (
              <div className="space-y-6">
                {/* Multi-Task Submission View */}
                {assignmentDetails?.assignment.assignment_type === 'multi_task' && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Student's Answers</Label>
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <MultiTaskSubmission 
                        assignment={assignmentDetails.assignment}
                        initialAnswers={selectedSubmission.answers}
                        readOnly={true}
                        onSubmit={() => {}}
                        studentId={String(selectedSubmission.user_id)}
                      />
                    </div>
                  </div>
                )}

                {/* File Upload View */}
                {selectedSubmission.file_url && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Submitted File</Label>
                    <div className="bg-gray-50 p-4 rounded-lg border flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        {selectedSubmission.submitted_file_name || 'submission_file'}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(
                          selectedSubmission.file_url, 
                          selectedSubmission.submitted_file_name || 'submission_file'
                        )}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}

                {/* Grading Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="score" className="text-sm font-medium text-gray-700 mb-2 block">
                      Score (max: {assignmentDetails?.assignment.max_score})
                    </Label>
                    <Input
                      id="score"
                      type="number"
                      min="0"
                      max={assignmentDetails?.assignment.max_score || 100}
                      value={scoreInput}
                      onChange={(e) => setScoreInput(e.target.value)}
                      placeholder="Enter score..."
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="feedback" className="text-sm font-medium text-gray-700 mb-2 block">
                      Feedback (optional)
                    </Label>
                    <Textarea
                      id="feedback"
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      placeholder="Enter feedback for the student..."
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Failed to load submission
              </div>
            )}
          </div>
          
          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setGradingDialog({ open: false, submissionId: null, studentName: '' })}
            >
              Cancel
            </Button>
            <Button
              onClick={submitGrade}
              disabled={savingGrade || !scoreInput}
            >
              {savingGrade ? 'Saving...' : 'Save Grade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
