import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { toast } from '../components/Toast';
import { 
  BookOpen, 
  Users, 
  ClipboardCheck, 
  TrendingUp, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Award,
  Target,
  BarChart3,
  Eye,
  CalendarDays
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';

interface TeacherStats {
  total_courses: number;
  total_students: number;
  pending_submissions: number;
  total_assignments: number;
  recent_enrollments: number;
  avg_completion_rate: number;
  upcoming_deadlines: number;
  avg_student_score: number;
  total_submissions: number;
  graded_submissions: number;
  grading_progress: number;
}

interface PendingSubmission {
  id: number;
  assignment_id: number;
  user_id: number;
  assignment_title?: string;
  student_name?: string;
  submitted_at: string;
  score?: number;
  is_graded: boolean;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [grading, setGrading] = useState<number | null>(null);

  useEffect(() => {
    loadTeacherData();
  }, []);

  const loadTeacherData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load teacher dashboard stats
      const dashboardData = await apiClient.getDashboardStats();
      const statsAny = (dashboardData as any)?.stats || {};
      // Extract teacher stats from dashboard data (fallback to zeros if structure differs)
      const teacherStats: TeacherStats = {
        total_courses: statsAny.total_courses ?? 0,
        total_students: statsAny.total_students ?? 0,
        pending_submissions: 0,
        total_assignments: statsAny.total_assignments ?? 0,
        recent_enrollments: statsAny.recent_enrollments ?? 0,
        avg_completion_rate: statsAny.avg_completion_rate ?? 0,
        upcoming_deadlines: statsAny.upcoming_deadlines ?? 0,
        avg_student_score: statsAny.avg_student_score ?? 0,
        total_submissions: statsAny.total_submissions ?? 0,
        graded_submissions: statsAny.graded_submissions ?? 0,
        grading_progress: statsAny.grading_progress ?? 0
      };

      setStats(teacherStats);

      // Load pending submissions
      try {
        const pendingSubmissions = await apiClient.getPendingSubmissions();
        setSubmissions(pendingSubmissions);
        setStats(prev => prev ? { ...prev, pending_submissions: pendingSubmissions.length } : null);
      } catch (submissionError) {
        console.warn('Failed to load submissions:', submissionError);
        setSubmissions([]);
      }

      // Load recent submissions
      try {
        const recentSubs = await apiClient.getRecentSubmissions(5);
        setRecentSubmissions(recentSubs);
      } catch (recentError) {
        console.warn('Failed to load recent submissions:', recentError);
        setRecentSubmissions([]);
      }

    } catch (err) {
      setError('Failed to load teacher dashboard data');
      console.error('Teacher dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmission = (assignmentId: number) => {
    // Navigate to assignment grading page for full context
    navigate(`/assignment/${assignmentId}/grade`);
  };

  const handleAllowResubmission = async (submissionId: number) => {
    try {
      await apiClient.allowResubmission(String(submissionId));
      toast('Resubmission allowed', 'info');
      loadTeacherData(); // Reload data
    } catch (error) {
      toast('Failed to allow resubmission', 'error');
      console.error('Resubmission error:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow p-4">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-12"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl shadow-card p-6">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="font-semibold text-red-800">Error</h3>
          </div>
          <p className="text-red-600 mt-1">{error}</p>
          <button 
            onClick={loadTeacherData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate('/teacher/courses')}
            variant="outline"
            className="flex items-center"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Manage Courses
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <div className="text-sm text-gray-600">Total Courses</div>
                <div className="text-2xl font-bold">{stats?.total_courses || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <div className="text-sm text-gray-600">Total Students</div>
                <div className="text-2xl font-bold">{stats?.total_students || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <ClipboardCheck className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <div className="text-sm text-gray-600">Pending Reviews</div>
                <div className="text-2xl font-bold">{stats?.pending_submissions || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <div className="text-sm text-gray-600">Total Assignments</div>
                <div className="text-2xl font-bold">{stats?.total_assignments || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-indigo-600 mr-3" />
              <div>
                <div className="text-sm text-gray-600">Completion Rate</div>
                <div className="text-2xl font-bold">{stats?.avg_completion_rate || 0}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Award className="w-8 h-8 text-yellow-600 mr-3" />
              <div>
                <div className="text-sm text-gray-600">Avg Score</div>
                <div className="text-2xl font-bold">{stats?.avg_student_score || 0}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-emerald-600 mr-3" />
              <div>
                <div className="text-sm text-gray-600">Grading Progress</div>
                <div className="text-2xl font-bold">{stats?.grading_progress || 0}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CalendarDays className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <div className="text-sm text-gray-600">Upcoming Deadlines</div>
                <div className="text-2xl font-bold">{stats?.upcoming_deadlines || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Submissions */}
      <Card className="overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-gray-200">
          <CardTitle className="text-lg font-semibold flex items-center">
            <Clock className="w-5 h-5 mr-2 text-orange-600" />
            Pending Submissions ({submissions.length})
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">Review and grade student submissions</p>
        </CardHeader>
        <CardContent className="p-0">
          {submissions.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-600">No pending submissions to review at the moment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium">Submission</th>
                    <th className="text-left px-6 py-3 font-medium">Assignment</th>
                    <th className="text-left px-6 py-3 font-medium">Student</th>
                    <th className="text-left px-6 py-3 font-medium">Submitted</th>
                    <th className="text-left px-6 py-3 font-medium">Status</th>
                    <th className="text-left px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map(submission => (
                    <tr key={submission.id} className="border-t hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          #{submission.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">
                          {submission.assignment_title || `Assignment #${submission.assignment_id}`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">
                          {submission.student_name || `Student #${submission.user_id}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(submission.submitted_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          submission.is_graded 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {submission.is_graded ? 'Graded' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <Button
                            className="text-xs"
                            variant="default"
                            onClick={() => handleGradeSubmission(submission.assignment_id)}
                          >
                            Review / Grade
                          </Button>
                          <Button
                            className="text-xs"
                            variant="outline"
                            onClick={() => handleAllowResubmission(submission.id)}
                          >
                            Allow Resubmit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Submissions */}
      <Card className="overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-gray-200">
          <CardTitle className="text-lg font-semibold flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-600" />
            Recent Submissions ({recentSubmissions.length})
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">Latest student submissions across all assignments</p>
        </CardHeader>
        <CardContent className="p-0">
          {recentSubmissions.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No recent submissions</h3>
              <p className="text-gray-600">No student submissions have been made recently.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium">Student</th>
                    <th className="text-left px-6 py-3 font-medium">Assignment</th>
                    <th className="text-left px-6 py-3 font-medium">Course</th>
                    <th className="text-left px-6 py-3 font-medium">Submitted</th>
                    <th className="text-left px-6 py-3 font-medium">Status</th>
                    <th className="text-left px-6 py-3 font-medium">Score</th>
                    <th className="text-left px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSubmissions.map(submission => (
                    <tr key={submission.id} className="border-t hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium">{submission.student_name}</div>
                        <div className="text-xs text-gray-500">{submission.student_email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{submission.assignment_title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-600">{submission.course_title}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(submission.submitted_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={submission.is_graded ? "default" : "secondary"}>
                          {submission.is_graded ? 'Graded' : 'Pending'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {submission.is_graded ? (
                          <div className="font-medium">
                            {submission.score}/{submission.max_score}
                          </div>
                        ) : (
                          <div className="text-gray-400">-</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGradeSubmission(submission.assignment_id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


