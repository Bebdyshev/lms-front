import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Users, 
  GraduationCap, 
  BarChart3, 
  Calendar, 
  ClipboardCheck, 
  Clock, 
  CheckCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Activity,
  FileText
} from 'lucide-react';
import Skeleton from '../components/Skeleton';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

export default function CuratorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Data state
  const [studentsProgress, setStudentsProgress] = useState<any[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('pending');
  const [studentPage, setStudentPage] = useState(1);
  const studentsPerPage = 10;

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [
        dashboardStats, 
        progressData, 
        pendingData, 
        recentData
      ] = await Promise.all([
        apiClient.getDashboardStats(),
        apiClient.getCuratorStudentsProgress(),
        apiClient.getCuratorPendingSubmissions(),
        apiClient.getCuratorRecentSubmissions(20)
      ]);
      
      setStats((dashboardStats as any).stats || dashboardStats || {});
      setStudentsProgress(progressData);
      setPendingSubmissions(pendingData);
      setRecentSubmissions(recentData);
    } catch (error) {
      console.error('Failed to load curator dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Process submissions for unified table
  const unifiedSubmissions = useMemo(() => {
    const all = [
      ...pendingSubmissions.map(s => ({ ...s, type: 'assignment', is_graded: false })),
      ...recentSubmissions.map(s => ({ ...s, type: 'assignment', is_graded: true }))
    ];

    // Remove duplicates if any
    const seen = new Set();
    const unique = all.filter(item => {
      const key = `${item.type}-${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by date desc
    return unique.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  }, [pendingSubmissions, recentSubmissions]);

  const filteredSubmissions = useMemo(() => {
    if (activeTab === 'pending') {
      return unifiedSubmissions.filter(s => !s.is_graded);
    }
    if (activeTab === 'graded') {
      return unifiedSubmissions.filter(s => s.is_graded);
    }
    return unifiedSubmissions;
  }, [unifiedSubmissions, activeTab]);

  // Pagination for students
  const totalStudentPages = Math.ceil(studentsProgress.length / studentsPerPage);
  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * studentsPerPage;
    return studentsProgress.slice(start, start + studentsPerPage);
  }, [studentsProgress, studentPage]);

  const handleGradeSubmission = (assignmentId: string) => {
    navigate(`/assignments/${assignmentId}/grade`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const firstName = user?.full_name?.split(' ')[0] || user?.name?.split(' ')[0] || 'Curator';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-gray-600 mt-1">
          Here's an overview of your groups and students
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" data-tour="dashboard-overview">
        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <div className="text-sm text-gray-600">Total Students</div>
                <div className="text-2xl font-bold">{stats?.total_students || studentsProgress.length || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center">
              <GraduationCap className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <div className="text-sm text-gray-600">My Groups</div>
                <div className="text-2xl font-bold">{stats?.total_groups || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <div className="text-sm text-gray-600">Avg Progress</div>
                <div className="text-2xl font-bold">{stats?.average_student_progress || 0}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center">
              <ClipboardCheck className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <div className="text-sm text-gray-600">Pending Reviews</div>
                <div className="text-2xl font-bold">{pendingSubmissions.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Submissions & Progress */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Student Progress Table */}
          <Card className="shadow-sm border-0">
            <CardHeader className="px-6 py-4 border-b border-gray-100 bg-white rounded-t-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900">Student Progress</CardTitle>
                  <p className="text-sm text-gray-500">Overview of student performance across courses</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50/80 text-gray-600 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-3 font-medium">Student</th>
                      <th className="text-left px-6 py-3 font-medium">Group & Course</th>
                      <th className="text-left px-6 py-3 font-medium">Current Lesson</th>
                      <th className="text-left px-6 py-3 font-medium">Progress</th>
                      <th className="text-left px-6 py-3 font-medium">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          No students found in your groups.
                        </td>
                      </tr>
                    ) : (
                      paginatedStudents.map((student, index) => (
                        <tr key={`${student.student_id}-${student.course_id}-${index}`} className="hover:bg-gray-50/80 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border border-gray-200">
                                <AvatarImage src={student.student_avatar} />
                                <AvatarFallback className="bg-blue-50 text-blue-600 text-xs">
                                  {student.student_name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-gray-900">{student.student_name}</div>
                                <div className="text-xs text-gray-500">{student.student_email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {student.group_name && (
                                <Badge variant="outline" className="w-fit text-[10px] px-1.5 py-0 h-4 bg-gray-50 text-gray-600 border-gray-200">
                                  {student.group_name}
                                </Badge>
                              )}
                              <span className="text-gray-700 font-medium truncate max-w-[150px]" title={student.course_title}>
                                {student.course_title}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-gray-700 truncate max-w-[180px]" title={student.current_lesson_title}>
                                {student.current_lesson_title || "Not started"}
                              </span>
                              {student.current_lesson_id && (
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                      style={{ width: `${student.lesson_progress || 0}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-gray-500 font-medium">{student.lesson_progress || 0}%</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative w-10 h-10 flex items-center justify-center">
                                <svg className="w-10 h-10 transform -rotate-90">
                                  <circle
                                    className="text-gray-100"
                                    strokeWidth="3"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="18"
                                    cx="20"
                                    cy="20"
                                  />
                                  <circle
                                    className={student.overall_progress >= 100 ? "text-green-500" : "text-blue-600"}
                                    strokeWidth="3"
                                    strokeDasharray={113}
                                    strokeDashoffset={113 - ((student.overall_progress || 0) / 100) * 113}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="18"
                                    cx="20"
                                    cy="20"
                                  />
                                </svg>
                                <span className="absolute text-[10px] font-bold text-gray-700">
                                  {student.overall_progress || 0}%
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {student.last_activity ? (
                              <div className="flex items-center text-gray-500 text-xs">
                                <Activity className="w-3 h-3 mr-1.5 text-gray-400" />
                                {new Date(student.last_activity).toLocaleDateString(undefined, {
                                  month: 'short', day: 'numeric'
                                })}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">No activity</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalStudentPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Showing <span className="font-medium">{((studentPage - 1) * studentsPerPage) + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(studentPage * studentsPerPage, studentsProgress.length)}</span> of{' '}
                    <span className="font-medium">{studentsProgress.length}</span> students
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStudentPage(p => Math.max(1, p - 1))}
                      disabled={studentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="text-sm font-medium text-gray-700 px-2">
                      Page {studentPage} of {totalStudentPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStudentPage(p => Math.min(totalStudentPages, p + 1))}
                      disabled={studentPage === totalStudentPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Sidebar Actions - Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card data-tour="groups-section">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate('/curator/homeworks')}
              >
                <FileText className="w-4 h-4 mr-2 text-purple-600" />
                Homework
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate('/analytics')}
              >
                <BarChart3 className="w-4 h-4 mr-2 text-blue-600" />
                View Detailed Analytics
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate('/chat')}
              >
                <Users className="w-4 h-4 mr-2 text-green-600" />
                Message Students
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
