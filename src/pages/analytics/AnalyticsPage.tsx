import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Progress } from '../../components/ui/progress';
import { Skeleton } from '../../components/ui/skeleton';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Course {
  id: number;
  title: string;
}

interface Group {
  id: number;
  name: string;
}

interface StudentAnalytics {
  student_id: number;
  student_name: string;
  email: string;
  group_name?: string;
  progress_percentage: number;
  last_activity?: string;
  average_score?: number;
}

interface QuizError {
  step_id: number;
  lesson_id: number;
  question_id: string;
  total_attempts: number;
  wrong_answers: number;
  error_rate: number;
  question_text: string;
  lesson_title: string;
  step_title: string;
}

interface OverviewStats {
  total_students: number;
  active_students: number;
  average_progress: number;
  average_score: number;
  completion_rate: number;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Filters
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  
  // Data
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [students, setStudents] = useState<StudentAnalytics[]>([]);
  const [quizErrors, setQuizErrors] = useState<QuizError[]>([]);
  const [progressHistory, setProgressHistory] = useState<any[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'students' | 'questions'>('overview');
  const [studentSort, setStudentSort] = useState<'name' | 'progress' | 'activity'>('progress');
  const [studentSortDir, setStudentSortDir] = useState<'asc' | 'desc'>('desc');

  // Load initial data
  useEffect(() => {
    loadCourses();
  }, []);

  // Load data when course changes
  useEffect(() => {
    if (selectedCourseId) {
      loadAnalyticsData();
    }
  }, [selectedCourseId, selectedGroupId]);

  const loadCourses = async () => {
    try {
      const coursesData = await apiClient.getCourses();
      // Map to local Course type with number id
      const mappedCourses = coursesData.map(c => ({ id: Number(c.id), title: c.title }));
      setCourses(mappedCourses);
      if (mappedCourses.length > 0) {
        setSelectedCourseId(String(mappedCourses[0].id));
      }
      
      // Load groups
      const groupsData = await apiClient.getGroupsAnalytics();
      setGroups(groupsData.groups || []);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  };

  const loadAnalyticsData = async () => {
    if (!selectedCourseId) return;
    
    setLoading(true);
    try {
      // Load course overview
      const overviewData = await apiClient.getCourseAnalyticsOverview(selectedCourseId);
      setOverview({
        total_students: overviewData.total_students || 0,
        active_students: overviewData.active_students || 0,
        average_progress: overviewData.average_progress || 0,
        average_score: overviewData.average_score || 0,
        completion_rate: overviewData.completion_rate || 0,
      });
      
      // Load students
      const groupIdNum = selectedGroupId !== 'all' ? Number(selectedGroupId) : undefined;
      const studentsData = await apiClient.getAllStudentsAnalytics(selectedCourseId);
      let filteredStudents = studentsData.students || [];
      if (groupIdNum) {
        filteredStudents = filteredStudents.filter((s: any) => s.group_id === groupIdNum);
      }
      setStudents(filteredStudents.map((s: any) => ({
        student_id: s.student_id,
        student_name: s.student_name,
        email: s.email || '',
        group_name: s.group_name,
        progress_percentage: s.progress_percentage || 0,
        last_activity: s.last_activity,
        average_score: s.average_score,
      })));
      
      // Load quiz errors
      const errorsData = await apiClient.getQuizErrors(selectedCourseId, groupIdNum, 15);
      setQuizErrors(errorsData.questions || []);
      
      // Generate mock progress history for chart (would ideally come from backend)
      const mockHistory = generateProgressHistory(studentsData.students || []);
      setProgressHistory(mockHistory);
      
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate progress history data for chart
  const generateProgressHistory = (studentsData: any[]) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const avgProgress = studentsData.length > 0 
      ? studentsData.reduce((sum, s) => sum + (s.progress_percentage || 0), 0) / studentsData.length
      : 0;
    
    return days.map((day, i) => ({
      day,
      progress: Math.max(0, avgProgress - (7 - i) * 3 + Math.random() * 5),
      activeStudents: Math.floor(studentsData.length * (0.5 + Math.random() * 0.3)),
    }));
  };

  // Sorted students
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      let cmp = 0;
      if (studentSort === 'name') {
        cmp = a.student_name.localeCompare(b.student_name);
      } else if (studentSort === 'progress') {
        cmp = a.progress_percentage - b.progress_percentage;
      } else if (studentSort === 'activity') {
        const aTime = a.last_activity ? new Date(a.last_activity).getTime() : 0;
        const bTime = b.last_activity ? new Date(b.last_activity).getTime() : 0;
        cmp = aTime - bTime;
      }
      return studentSortDir === 'desc' ? -cmp : cmp;
    });
  }, [students, studentSort, studentSortDir]);

  const handleSortChange = (field: 'name' | 'progress' | 'activity') => {
    if (studentSort === field) {
      setStudentSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setStudentSort(field);
      setStudentSortDir('desc');
    }
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };



  const getErrorRateColor = (rate: number) => {
    if (rate >= 50) return 'text-red-600 font-semibold';
    if (rate >= 30) return 'text-orange-600';
    return 'text-gray-600';
  };

  if (!user || !['teacher', 'curator', 'admin'].includes(user.role)) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-500">You don't have permission to view analytics.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Analytics</h1>
          <p className="text-gray-500 mt-1">Track student progress and identify areas for improvement</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map(course => (
                <SelectItem key={course.id} value={String(course.id)}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {groups.map(group => (
                <SelectItem key={group.id} value={String(group.id)}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 mb-1">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{overview?.total_students || 0}</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 mb-1">Avg Progress</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(overview?.average_progress || 0)}%</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 mb-1">Avg Score</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(overview?.average_score || 0)}%</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 mb-1">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(overview?.completion_rate || 0)}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="questions">Difficult Questions</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Overview View */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Weekly Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={progressHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      formatter={(value: any) => [`${Math.round(value)}%`, 'Progress']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="progress" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Difficult Questions Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Top Difficult Questions</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setActiveView('questions')}
                className="text-blue-600 hover:text-blue-700"
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : quizErrors.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No quiz data available yet</p>
              ) : (
                <div className="space-y-3">
                  {quizErrors.slice(0, 5).map((error, idx) => (
                    <div 
                      key={`${error.step_id}-${error.question_id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {error.question_text || `Question ${idx + 1}`}
                        </p>
                        <p className="text-xs text-gray-500">{error.lesson_title}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm ${getErrorRateColor(error.error_rate)}`}>
                          {error.error_rate}% wrong
                        </p>
                        <p className="text-xs text-gray-400">{error.total_attempts} attempts</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Students View */}
      {activeView === 'students' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Student Progress ({students.length} students)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : students.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No students found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSortChange('name')}
                      >
                        Student {studentSort === 'name' && (studentSortDir === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSortChange('progress')}
                      >
                        Progress {studentSort === 'progress' && (studentSortDir === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSortChange('activity')}
                      >
                        Last Active {studentSort === 'activity' && (studentSortDir === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedStudents.map(student => (
                      <TableRow 
                        key={student.student_id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/analytics/student/${student.student_id}?course_id=${selectedCourseId}`)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{student.student_name}</p>
                            <p className="text-xs text-gray-500">{student.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {student.group_name || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-24">
                              <Progress 
                                value={student.progress_percentage} 
                                className="h-2"
                              />
                            </div>
                            <span className="text-sm text-gray-900 font-medium">
                              {Math.round(student.progress_percentage)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {formatTimeAgo(student.last_activity)}
                        </TableCell>
                        <TableCell className="text-gray-900 font-medium">
                          {student.average_score != null ? `${Math.round(student.average_score)}%` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Difficult Questions View */}
      {activeView === 'questions' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Questions by Error Rate
            </CardTitle>
            <p className="text-sm text-gray-500">
              Questions that students struggle with the most
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : quizErrors.length === 0 ? (
              <p className="text-gray-500 text-center py-12">
                No quiz attempts recorded yet. Students need to complete quizzes to see error analysis.
              </p>
            ) : (
              <div className="space-y-4">
                {quizErrors.map((error, idx) => (
                  <div 
                    key={`${error.step_id}-${error.question_id}`}
                    className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            #{idx + 1}
                          </span>
                          <span className="text-xs text-gray-400">{error.lesson_title}</span>
                        </div>
                        <p className="text-sm text-gray-900 leading-relaxed">
                          {error.question_text || 'Question text not available'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-lg font-bold ${getErrorRateColor(error.error_rate)}`}>
                          {error.error_rate}%
                        </p>
                        <p className="text-xs text-gray-400">
                          {error.wrong_answers} / {error.total_attempts} wrong
                        </p>
                      </div>
                    </div>
                    
                    {/* Error bar visualization */}
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-400 rounded-full"
                          style={{ width: `${error.error_rate}%` }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 text-xs"
                        onClick={() => navigate(`/lesson/${error.lesson_id}/edit?questionId=${error.question_id}`)}
                      >
                        Edit Question
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
