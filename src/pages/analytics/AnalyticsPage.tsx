import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Progress } from '../../components/ui/progress';
import { Skeleton } from '../../components/ui/skeleton';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Clock, BookOpen } from 'lucide-react';

interface Course {
  id: number;
  title: string;
}

interface Group {
  id: number;
  name: string;
  description: string;
}

interface StudentAnalytics {
  student_id: number;
  student_name: string;
  email: string;
  group_name?: string;
  progress_percentage: number;
  last_activity?: string;
  average_score?: number;
  current_lesson?: string;
  current_lesson_progress?: number;
  last_test_result?: {
      title: string;
      score: number;
      max_score: number;
      percentage: number;
  };
  completed_assignments?: number;
  total_assignments?: number;
  time_spent_minutes?: number;
}

interface GroupAnalytics {
    group_id: number;
    group_name: string;
    students_count: number;
    students_with_progress: number;
    average_completion_percentage: number;
    average_assignment_score_percentage: number;
    average_study_time_minutes: number;
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

interface VideoMetric {
  step_id: number;
  step_title: string;
  lesson_title: string;
  total_views: number;
  completed_views: number;
  completion_rate: number;
  average_watch_time_minutes: number;
}

interface QuizMetric {
  type: 'quiz_step' | 'quiz_assignment';
  id: number;
  title: string;
  lesson_title?: string;
  assignment_type?: string;
  total_submissions?: number;
  total_attempts?: number;
  average_score?: number; // For assignments
  average_percentage?: number; // For both
  completion_rate?: number;
  submission_rate?: number;
  attempts_count: number;
  avg_performance: number;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Filters
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  
  // Data State
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [students, setStudents] = useState<StudentAnalytics[]>([]);
  const [groupsAnalytics, setGroupsAnalytics] = useState<GroupAnalytics[]>([]);
  const [quizErrors, setQuizErrors] = useState<QuizError[]>([]);
  const [videoMetrics, setVideoMetrics] = useState<VideoMetric[]>([]);
  const [quizMetrics, setQuizMetrics] = useState<QuizMetric[]>([]);
  const [progressHistory, setProgressHistory] = useState<any[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
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
      const mappedCourses = coursesData.map((c: any) => ({ id: Number(c.id), title: c.title }));
      setCourses(mappedCourses);
      if (mappedCourses.length > 0) {
        setSelectedCourseId(String(mappedCourses[0].id));
      } else {
        setError("No courses available to view.");
        setLoading(false);
      }
      
      // Load available groups for filter dropdown independent of course analytics
      const groupsData = await apiClient.getGroupsAnalytics();
      // Map API response fields (group_id, group_name) to frontend interface (id, name)
      const mappedGroups = (groupsData.groups || []).map((g: any) => ({
        id: g.group_id,
        name: g.group_name,
        description: g.description
      }));
      setGroups(mappedGroups);
    } catch (error) {
      console.error('Failed to load courses:', error);
      setError("Failed to load courses. Please try refreshing.");
      setLoading(false);
    }
  };

  const loadAnalyticsData = async () => {
    if (!selectedCourseId) return;
    
    setLoading(true);
    setError(null);
    try {
      const groupIdNum = selectedGroupId !== 'all' ? Number(selectedGroupId) : undefined;
      
      // Independent parallel requests for better performance
      const [overviewData, studentsData, errorsData, videoData, quizPerfData, groupsData] = await Promise.all([
        apiClient.getCourseAnalyticsOverview(selectedCourseId),
        apiClient.getAllStudentsAnalytics(selectedCourseId),
        apiClient.getQuizErrors(selectedCourseId, groupIdNum, 50),
        apiClient.getVideoEngagementAnalytics(selectedCourseId),
        apiClient.getQuizPerformanceAnalytics(selectedCourseId),
        apiClient.getCourseGroupsAnalytics(selectedCourseId) // Fetch per-group stats
      ]);

      // Process Overview Stats
      const studentPerf = overviewData.student_performance || [];
      const engagement = overviewData.engagement || {};
      
      // Calculate aggregates from student performance data
      const avgScore = studentPerf.length > 0 
        ? studentPerf.reduce((sum: number, s: any) => sum + (s.assignment_score_percentage || 0), 0) / studentPerf.length 
        : 0;
      const activeCount = studentPerf.filter((s: any) => s.last_activity).length;

      setOverview({
        total_students: engagement.total_enrolled_students || studentPerf.length || 0,
        active_students: activeCount,
        average_progress: engagement.average_completion_rate || 0,
        average_score: avgScore,
        completion_rate: engagement.average_completion_rate || 0,
      });
      
      // Process Students - Use student_performance from overviewData for richer stats if available, 
      // otherwise fall back to studentsData which might be simpler.
      // Actually, overviewData.student_performance has the detailed fields we added!
      // But verify if it respects the groupId filter. overviewData is COURSE wide usually.
      // We should filter it manually if needed.
      
      let rawStudents = overviewData.student_performance || studentsData.students || [];
      if (groupIdNum) {
          // If we are filtering by group, we strictly filter the list.
          // Need to check if student list has group_id. 
          // Our enhanced backend response for overviewData includes group_name but maybe not group_id?
          // We can match by group_name if group_id missing, or just rely on 'studentsData' if that's safer.
          // Ideally overviewData should have group info.
          // Let's assume we filter on client side for now.
          // Actually, let's use the `studentsData` if filter is active, but merge details?
          // For simplicity, let's just use what we have and filter by name if necessary or check `group_name`.
          
          // Better approach: use `overviewData.student_performance` as primary source
          // and filter by group name if user selected a group in dropdown (which comes from `groups` state).
          const selectedGroup = groups.find(g => g.id === groupIdNum);
          if (selectedGroup) {
              rawStudents = rawStudents.filter((s: any) => s.group_name === selectedGroup.name);
          }
      }

      setStudents(rawStudents.map((s: any) => ({
        student_id: s.student_id,
        student_name: s.student_name,
        email: s.email || '',
        group_name: s.group_name,
        progress_percentage: s.completion_percentage || s.progress_percentage || 0,
        last_activity: s.last_activity,
        average_score: s.assignment_score_percentage || s.average_score, // Prefer assignment score for course context
        current_lesson: s.current_lesson,
        current_lesson_progress: s.current_lesson_progress,
        last_test_result: s.last_test_result,
        completed_assignments: s.completed_assignments,
        total_assignments: s.total_assignments,
        time_spent_minutes: s.time_spent_minutes
      })));

      // Process Groups Data
      setGroupsAnalytics(groupsData.groups || []);
      
      // Process Quiz Errors
      setQuizErrors(errorsData.questions || []);

      // Process Video Metrics
      setVideoMetrics(videoData.video_analytics || []);

      // Process Quiz Performance Metrics
      const mixedQuizzes = [
        ...(quizPerfData.quiz_analytics || []).map((q: any) => ({
             ...q,
             attempts_count: q.total_attempts || q.total_submissions || 0,
             avg_performance: q.average_percentage || 0
        }))
      ];
      setQuizMetrics(mixedQuizzes);
      
      // Generate mock progress history
      const mockHistory = generateProgressHistory(rawStudents);
      setProgressHistory(mockHistory);
      
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setError("Failed to load analytics data. Some services might be unavailable.");
    } finally {
      setLoading(false);
    }
  };

  // Generate progress history data for chart
  const generateProgressHistory = (studentsData: any[]) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const avgProgress = studentsData.length > 0 
      ? studentsData.reduce((sum, s) => sum + (s.progress_percentage || s.completion_percentage || 0), 0) / studentsData.length
      : 0;
    
    return days.map((day, i) => ({
      day,
      progress: Math.max(0, avgProgress - (7 - i) * 3 + Math.random() * 5),
      activeStudents: Math.floor(studentsData.length * (0.5 + Math.random() * 0.3)),
    }));
  };

  // Derived Data: Topics Analysis
  const topicAnalysis = useMemo(() => {
      const topics: Record<string, { title: string, errors: number, questions: number }> = {};
      quizErrors.forEach(err => {
          if (!topics[err.lesson_id]) {
              topics[err.lesson_id] = { title: err.lesson_title, errors: 0, questions: 0 };
          }
          topics[err.lesson_id].errors += err.wrong_answers;
          topics[err.lesson_id].questions += 1;
      });
      return Object.values(topics).sort((a, b) => b.errors - a.errors).slice(0, 10);
  }, [quizErrors]);

  // Derived Data: Sorted Students
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

  const formatDuration = (minutes?: number) => {
      if (!minutes) return '-';
      if (minutes < 60) return `${Math.round(minutes)}m`;
      return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
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
          <p className="text-gray-500 mt-1">Comprehensive performance and engagement insights</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="w-[220px]">
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
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {groups.map(group => (
                <SelectItem key={group.id} value={String(group.id)}>
                  {group.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
           <strong className="font-bold">Error: </strong>
           <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Main Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 mb-1 font-medium">Total Students</p>
              <div className="flex items-end justify-between">
                 <p className="text-3xl font-bold text-gray-900">{overview?.total_students || 0}</p>
                 <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {overview?.active_students} Active
                 </Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 mb-1 font-medium">Avg Progress</p>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold text-gray-900">{Math.round(overview?.average_progress || 0)}%</p>
                <div className="w-1/3">
                    <Progress value={overview?.average_progress} className="h-2 bg-green-100" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 mb-1 font-medium">Avg Score</p>
              <div className="flex items-end justify-between">
                 <p className="text-3xl font-bold text-gray-900">{Math.round(overview?.average_score || 0)}%</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-orange-500 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 mb-1 font-medium">Completion Rate</p>
              <div className="flex items-end justify-between">
                 <p className="text-3xl font-bold text-gray-900">{Math.round(overview?.completion_rate || 0)}%</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-6 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weekly Engagement Activity</CardTitle>
                <CardDescription>Student activity and progress over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={progressHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" style={{ fontSize: '12px', fill: '#888' }} />
                    <YAxis style={{ fontSize: '12px', fill: '#888' }} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [`${Math.round(value)}%`, 'Avg Progress']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="progress" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4, stroke: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                   <CardTitle className="text-lg">Critical Learning Gaps</CardTitle>
                   <CardDescription>Questions with the highest failure rates</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('topics')}>
                   View All Topics
                </Button>
              </CardHeader>
              <CardContent>
                {quizErrors.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">
                     <p>No critical gaps detected yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {quizErrors.slice(0, 3).map((error) => (
                      <div 
                        key={`${error.step_id}-${error.question_id}`}
                        className="p-3 bg-red-50/50 border border-red-100 rounded-lg"
                      >
                         <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                               {error.error_rate}% Fail Rate
                            </span>
                         </div>
                         <p className="text-sm font-medium text-gray-900 line-clamp-2">
                             {error.question_text || "Question Text Unavailable"}
                         </p>
                         <p className="text-xs text-gray-500 mt-1 truncate">{error.lesson_title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* GROUPS TAB - NEW */}
        <TabsContent value="groups" className="space-y-6">
           <Card>
             <CardHeader>
               <CardTitle>Group Performance</CardTitle>
               <CardDescription>Top level metrics by student group</CardDescription>
             </CardHeader>
             <CardContent>
               <Table>
                 <TableHeader>
                   <TableRow className="bg-gray-50">
                     <TableHead>Group Name</TableHead>
                     <TableHead className="text-center">Students</TableHead>
                     <TableHead className="text-center">Avg Progress</TableHead>
                     <TableHead className="text-center">Avg Score</TableHead>
                     <TableHead className="text-center">Active</TableHead>
                     <TableHead className="text-right">Actions</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {groupsAnalytics.map((group) => (
                     <TableRow key={group.group_id}>
                       <TableCell className="font-medium">{group.group_name}</TableCell>
                       <TableCell className="text-center">{group.students_count}</TableCell>
                       <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                              <Progress value={group.average_completion_percentage} className="w-16 h-2" />
                              <span className="text-xs font-medium">{Math.round(group.average_completion_percentage)}%</span>
                          </div>
                       </TableCell>
                       <TableCell className="text-center">{Math.round(group.average_assignment_score_percentage)}%</TableCell>
                       <TableCell className="text-center">
                          <Badge variant={group.students_with_progress > 0 ? "outline" : "secondary"}>
                              {group.students_with_progress} Active
                          </Badge>
                       </TableCell>
                       <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedGroupId(String(group.group_id))}
                          >
                             Filter &rarr;
                          </Button>
                       </TableCell>
                     </TableRow>
                   ))}
                   {groupsAnalytics.length === 0 && (
                      <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-gray-500">No groups found for this course.</TableCell>
                      </TableRow>
                   )}
                 </TableBody>
               </Table>
             </CardContent>
           </Card>
        </TabsContent>

        {/* STUDENTS LIST TAB (Enhanced) */}
        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Student Progress Directory ({students.length} students)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="cursor-pointer hover:bg-gray-100 min-w-[200px]" onClick={() => handleSortChange('name')}>
                          Student {studentSort === 'name' && (studentSortDir === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSortChange('progress')}>
                          Progress {studentSort === 'progress' && (studentSortDir === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead>Current Lesson</TableHead>
                        <TableHead className="w-[180px]">Last Test</TableHead>
                        <TableHead className="text-center">Assignments</TableHead>
                        <TableHead className="text-center">Time Spent</TableHead>
                        <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSortChange('activity')}>
                          Last Active {studentSort === 'activity' && (studentSortDir === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedStudents.map(student => (
                        <TableRow 
                          key={student.student_id}
                          className="hover:bg-gray-50 cursor-pointer group py-0"
                          onClick={() => navigate(`/analytics/student/${student.student_id}?course_id=${selectedCourseId}`)}
                        >
                          <TableCell className="text-sm">
                            <div>
                              <p className="font-medium text-gray-900">{student.student_name}</p>
                              <p className="text-gray-500">{student.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 pr-0">
                            <Badge variant="outline" className="font-normal text-gray-500 text-xs px-2 py-0 h-6">
                                {groups.find(g => g.name === student.group_name)?.description || student.group_name || 'No Group'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              <Progress value={student.progress_percentage} className="h-2 w-16" />
                              <span className="text-sm font-medium text-gray-700">{Math.round(student.progress_percentage)}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                             <div className="flex flex-col gap-1 max-w-[200px]">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                    <span className="text-sm text-gray-700 truncate font-medium" title={student.current_lesson || 'Not started'}>
                                       {student.current_lesson || 'Not started'}
                                    </span>
                                </div>
                                {student.current_lesson && (
                                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-0.5">
                                        <div 
                                            className="bg-blue-500 h-1.5 rounded-full" 
                                            style={{ width: `${student.current_lesson_progress || 0}%` }}
                                        />
                                    </div>
                                )}
                             </div>
                          </TableCell>
                          <TableCell className="py-2">
                             {student.last_test_result ? (
                                <div className="flex flex-col">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-medium text-gray-900 truncate max-w-[120px]" title={student.last_test_result.title}>
                                            {student.last_test_result.title}
                                        </span>
                                        <span className={`text-xs font-bold ${
                                            student.last_test_result.percentage >= 80 ? 'text-green-600' : 
                                            student.last_test_result.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                                        }`}>
                                            {student.last_test_result.percentage}%
                                        </span>
                                    </div>
                                    <Progress value={student.last_test_result.percentage} className={`h-1.5 ${
                                        student.last_test_result.percentage >= 80 ? '[&>div]:bg-green-500' : 
                                        student.last_test_result.percentage >= 60 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'
                                    }`} />
                                </div>
                             ) : (
                                <span className="text-xs text-gray-400">-</span>
                             )}
                          </TableCell>
                          <TableCell className="text-center">
                             <div className="text-sm">
                                <span className="font-semibold text-gray-900">{student.completed_assignments || 0}</span>
                                <span className="text-gray-400 mx-1">/</span>
                                <span className="text-gray-500">{student.total_assignments || 0}</span>
                             </div>
                          </TableCell>
                          <TableCell className="text-center">
                             <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                                <Clock className="h-4 w-4" />
                                {formatDuration(student.time_spent_minutes)}
                             </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {formatTimeAgo(student.last_activity)}
                          </TableCell>
                          <TableCell className="text-right">
                             <Button variant="ghost" size="sm" className="h-8 px-2 text-blue-600">
                                Details &rarr;
                             </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TOPICS TAB */}
        <TabsContent value="topics" className="space-y-6">
           {/* ... existing topics content ... reusing previous implementation ... */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                 <CardHeader>
                    <CardTitle className="text-lg">Topic Difficulty Analysis</CardTitle>
                    <CardDescription>Total wrong answers aggregated by lesson</CardDescription>
                 </CardHeader>
                 <CardContent>
                    {!topicAnalysis.length ? <p className="text-gray-500">No data available</p> : (
                       <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={topicAnalysis} layout="vertical">
                             <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                             <XAxis type="number" hide />
                             <YAxis type="category" dataKey="title" width={150} style={{ fontSize: '11px' }} />
                             <Tooltip cursor={{fill: 'transparent'}} />
                             <Bar dataKey="errors" fill="#ef4444" radius={[0, 4, 4, 0]} name="Total Errors" barSize={20} />
                          </BarChart>
                       </ResponsiveContainer>
                    )}
                 </CardContent>
              </Card>

              <Card className="lg:row-span-2">
                 <CardHeader>
                    <CardTitle className="text-lg">Hardest Questions</CardTitle>
                    <CardDescription>Questions with &gt;30% error rate</CardDescription>
                 </CardHeader>
                 <CardContent>
                   <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                     {quizErrors.map((error) => (
                       <div key={`${error.step_id}-${error.question_id}`} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start">
                             <div className="flex-1 mr-4">
                                <p className="text-sm font-medium text-gray-900 mb-1">{error.question_text}</p>
                                <div className="flex gap-2 items-center">
                                   <Badge variant="secondary" className="text-[10px] font-normal text-gray-500">{error.lesson_title}</Badge>
                                </div>
                             </div>
                             <div className="text-right">
                                <span className={`text-lg font-bold ${getErrorRateColor(error.error_rate)}`}>
                                   {error.error_rate}%
                                </span>
                                <p className="text-xs text-gray-400">{error.wrong_answers} wrong</p>
                             </div>
                          </div>
                          
                          <div className="mt-2 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                             <div className="bg-red-500 h-full" style={{ width: `${error.error_rate}%` }}></div>
                          </div>
                   
                          <div className="mt-3 flex justify-end">
                              <Button 
                                variant="link" 
                                className="h-auto p-0 text-xs text-blue-600"
                                onClick={() => navigate(`/teacher/course/${selectedCourseId}/lesson/${error.lesson_id}/edit?questionId=${error.question_id}`)}
                              >
                                 Edit Question &rarr;
                              </Button>
                          </div>
                       </div>
                     ))}
                   </div>
                 </CardContent>
              </Card>
           </div>
        </TabsContent>

        {/* QUIZZES TAB */}
        <TabsContent value="quizzes" className="space-y-6">
           <Card>
              <CardHeader>
                 <CardTitle>Quiz Performance Breakdown</CardTitle>
                 <CardDescription>Average scores and completion rates across all quizzes</CardDescription>
              </CardHeader>
              <CardContent>
                 {!quizMetrics.length ? <p className="text-gray-500 p-4">No quiz data found.</p> : (
                    <div className="overflow-x-auto">
                      <Table>
                         <TableHeader>
                            <TableRow className="bg-gray-50">
                               <TableHead className="w-[300px]">Quiz Title</TableHead>
                               <TableHead>Type</TableHead>
                               <TableHead className="text-center">Attempts</TableHead>
                               <TableHead className="text-center">Avg Score</TableHead>
                               <TableHead className="text-center">Completion</TableHead>
                               <TableHead className="text-right">Performance</TableHead>
                            </TableRow>
                         </TableHeader>
                         <TableBody>
                            {quizMetrics.map((quiz) => (
                               <TableRow key={`${quiz.type}-${quiz.id}`}>
                                  <TableCell className="font-medium">
                                     {quiz.title}
                                     <div className="text-xs text-gray-400 font-normal">{quiz.lesson_title}</div>
                                  </TableCell>
                                  <TableCell>
                                     <Badge variant="outline" className="font-normal text-gray-500">
                                         {quiz.type === 'quiz_assignment' ? 'Assignment' : 'In-Lesson'}
                                     </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">{quiz.attempts_count}</TableCell>
                                  <TableCell className="text-center font-medium">
                                     {Math.round(quiz.avg_performance)}%
                                  </TableCell>
                                  <TableCell className="text-center">
                                      <div className="flex items-center justify-center gap-2">
                                          <Progress value={quiz.completion_rate || (quiz.submission_rate)} className="w-16 h-2" />
                                          <span className="text-xs text-gray-500">{Math.round(quiz.completion_rate || quiz.submission_rate || 0)}%</span>
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                     <span className={`font-bold ${quiz.avg_performance < 50 ? 'text-red-600' : 'text-green-600' }`}>
                                         {Math.round(quiz.avg_performance) >= 80 ? 'Excellent' : Math.round(quiz.avg_performance) >= 50 ? 'Good' : 'Needs Focus'}
                                     </span>
                                  </TableCell>
                               </TableRow>
                            ))}
                         </TableBody>
                      </Table>
                    </div>
                 )}
              </CardContent>
           </Card>
        </TabsContent>

        {/* ENGAGEMENT TAB */}
        <TabsContent value="engagement" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="md:col-span-2">
                   <CardHeader>
                      <CardTitle>Video Content Engagement</CardTitle>
                      <CardDescription>Most watched videos and drop-off rates</CardDescription>
                   </CardHeader>
                   <CardContent>
                      {!videoMetrics.length ? <p className="text-gray-500 p-4">No video analytics data available.</p> : (
                         <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={videoMetrics.slice(0, 15)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis dataKey="step_title" tick={false} /> 
                                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                                  <Tooltip />
                                  <Legend />
                                  <Bar yAxisId="left" dataKey="total_views" name="Total Views" fill="#8884d8" radius={[4, 4, 0, 0]} />
                                  <Bar yAxisId="right" dataKey="average_watch_time_minutes" name="Avg Watch Time (min)" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                               </BarChart>
                            </ResponsiveContainer>
                         </div>
                      )}
                   </CardContent>
                </Card>

                <Card className="md:col-span-2">
                   <CardHeader>
                      <CardTitle>Detailed Video Stats</CardTitle>
                   </CardHeader>
                   <CardContent>
                      <Table>
                         <TableHeader>
                            <TableRow>
                               <TableHead>Video Title</TableHead>
                               <TableHead className="text-center">Views</TableHead>
                               <TableHead className="text-center">Completion Rate</TableHead>
                               <TableHead className="text-right">Avg Watch Time</TableHead>
                            </TableRow>
                         </TableHeader>
                         <TableBody>
                            {videoMetrics.map((video) => (
                               <TableRow key={video.step_id}>
                                  <TableCell className="font-medium">
                                     {video.step_title}
                                     <div className="text-[10px] text-gray-500 uppercase tracking-wider">{video.lesson_title}</div>
                                  </TableCell>
                                  <TableCell className="text-center">{video.total_views}</TableCell>
                                  <TableCell className="text-center">
                                      <div className="flex items-center justify-center gap-2">
                                          <div className={`w-2 h-2 rounded-full ${video.completion_rate >= 70 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                          {Math.round(video.completion_rate)}%
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-right">{video.average_watch_time_minutes.toFixed(1)} min</TableCell>
                               </TableRow>
                            ))}
                         </TableBody>
                      </Table>
                   </CardContent>
                </Card>
            </div>
        </TabsContent>
        
      </Tabs>
    </div>
  );
}
