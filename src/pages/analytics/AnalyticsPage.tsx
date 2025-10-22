import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Progress } from '../../components/ui/progress';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Users, BookOpen, PlayCircle, HelpCircle, Clock, TrendingUp, 
  Award, Target, Eye, AlertCircle, Download
} from 'lucide-react';
import { 
  getTeacherCourses, 
  getProgressStudents, 
  getCourseAnalyticsOverview, 
  getDetailedStudentAnalytics, 
  getVideoEngagementAnalytics, 
  getQuizPerformanceAnalytics,
  fetchCourses,
  getAllStudentsAnalytics,
  getGroupsAnalytics,
  getCourseGroupsAnalytics,
  getGroupStudentsAnalytics,
  exportStudentReport,
  exportGroupReport,
  exportAllStudentsReport
} from '../../services/api';
import StudentsTable from '../../components/StudentsTable';
import GroupsTable from '../../components/GroupsTable';
import StudentDetailedProgress from '../../components/StudentDetailedProgress';
import { useAuth } from '../../contexts/AuthContext';

interface StudentAnalytics {
  student_info: {
    id: number;
    name: string;
    email: string;
    student_id: string;
    total_study_time_minutes: number;
    daily_streak: number;
    last_activity_date: string;
  };
  courses: CourseAnalytics[];
}

interface CourseAnalytics {
  course_id: number;
  course_title: string;
  teacher_name: string;
  modules: ModuleAnalytics[];
}

interface ModuleAnalytics {
  module_id: number;
  module_title: string;
  lessons: LessonAnalytics[];
}

interface LessonAnalytics {
  lesson_id: number;
  lesson_title: string;
  total_steps: number;
  completed_steps: number;
  total_time_spent: number;
  steps: StepAnalytics[];
  assignments: AssignmentAnalytics[];
}

interface StepAnalytics {
  step_id: number;
  step_title: string;
  content_type: string;
  order_index: number;
  progress: {
    status: string;
    visited_at: string | null;
    completed_at: string | null;
    time_spent_minutes: number;
  };
}

interface AssignmentAnalytics {
  assignment_id: number;
  assignment_title: string;
  assignment_type: string;
  max_score: number;
  submission: {
    submitted: boolean;
    score: number | null;
    submitted_at: string | null;
    is_graded: boolean;
  } | null;
}

interface CourseOverview {
  course_info: {
    id: number;
    title: string;
    teacher_name: string;
  };
  structure: {
    total_modules: number;
    total_lessons: number;
    total_steps: number;
  };
  engagement: {
    total_enrolled_students: number;
    total_time_spent_minutes: number;
    total_completed_steps: number;
    average_completion_rate: number;
  };
  student_performance: StudentPerformance[];
}

interface StudentPerformance {
  student_id: number;
  student_name: string;
  completed_steps: number;
  total_steps_available: number;
  completion_percentage: number;
  time_spent_minutes: number;
  completed_assignments: number;
  total_assignments: number;
  assignment_score_percentage: number;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [selectedView, setSelectedView] = useState<'overview' | 'student' | 'video' | 'quiz' | 'all-students' | 'groups' | 'detailed-progress'>('overview');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [detailedProgressStudentId, setDetailedProgressStudentId] = useState<number | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [courseGroups, setCourseGroups] = useState<any[]>([]);
  const [groupStudents, setGroupStudents] = useState<any[]>([]);
  const [courseOverview, setCourseOverview] = useState<CourseOverview | null>(null);
  const [studentAnalytics, setStudentAnalytics] = useState<StudentAnalytics | null>(null);
  const [videoAnalytics, setVideoAnalytics] = useState<any>(null);
  const [quizAnalytics, setQuizAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user has analytics access
  const hasAnalyticsAccess = user?.role && ['teacher', 'curator', 'admin'].includes(user.role);

  useEffect(() => {
    if (hasAnalyticsAccess) {
      loadCourses();
      loadStudents();
    }
  }, [hasAnalyticsAccess]);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseOverview();
      loadCourseGroups();
      if (selectedView === 'video') {
        loadVideoAnalytics();
      } else if (selectedView === 'quiz') {
        loadQuizAnalytics();
      }
    }
  }, [selectedCourse, selectedView]);

  useEffect(() => {
    if (selectedStudent && selectedView === 'student') {
      loadStudentAnalytics();
    }
  }, [selectedStudent, selectedView, selectedCourse]);

  useEffect(() => {
    if (selectedView === 'all-students') {
      loadAllStudents();
    } else if (selectedView === 'groups') {
      loadGroups();
    }
  }, [selectedView]);

  useEffect(() => {
    if (selectedGroup && selectedView === 'groups') {
      loadGroupStudents();
    }
  }, [selectedGroup, selectedView]);

  const loadCourses = async () => {
    try {
      // Load courses based on user role
      let coursesData = [];
      if (user?.role === 'teacher') {
        coursesData = await getTeacherCourses();
      } else if (user?.role === 'admin') {
        coursesData = await fetchCourses();
      }
      setCourses(coursesData);
      if (coursesData.length > 0) {
        setSelectedCourse(coursesData[0].id.toString());
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  };

  const loadStudents = async () => {
    try {
      const studentsData = await getProgressStudents();
      setStudents(studentsData);
    } catch (error) {
      console.error('Failed to load students:', error);
    }
  };

  const loadCourseOverview = async () => {
    if (!selectedCourse) return;
    
    try {
      setIsLoading(true);
      const data = await getCourseAnalyticsOverview(selectedCourse);
      setCourseOverview(data);
    } catch (error) {
      console.error('Failed to load course overview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudentAnalytics = async () => {
    if (!selectedStudent) return;
    
    try {
      setIsLoading(true);
      const data = await getDetailedStudentAnalytics(selectedStudent, selectedCourse || undefined);
      setStudentAnalytics(data);
    } catch (error) {
      console.error('Failed to load student analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVideoAnalytics = async () => {
    if (!selectedCourse) return;
    
    try {
      setIsLoading(true);
      const data = await getVideoEngagementAnalytics(selectedCourse);
      setVideoAnalytics(data);
    } catch (error) {
      console.error('Failed to load video analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuizAnalytics = async () => {
    if (!selectedCourse) return;
    
    try {
      setIsLoading(true);
      const data = await getQuizPerformanceAnalytics(selectedCourse);
      setQuizAnalytics(data);
    } catch (error) {
      console.error('Failed to load quiz analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllStudents = async () => {
    try {
      setIsLoading(true);
      const data = await getAllStudentsAnalytics();
      setAllStudents(data.students || []);
    } catch (error) {
      console.error('Failed to load all students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      const data = await getGroupsAnalytics();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourseGroups = async () => {
    if (!selectedCourse) return;
    
    try {
      const data = await getCourseGroupsAnalytics(selectedCourse);
      setCourseGroups(data.groups || []);
    } catch (error) {
      console.error('Failed to load course groups:', error);
      setCourseGroups([]);
    }
  };

  const loadGroupStudents = async () => {
    if (!selectedGroup) return;
    
    try {
      setIsLoading(true);
      const data = await getGroupStudentsAnalytics(selectedGroup);
      setGroupStudents(data.students || []);
    } catch (error) {
      console.error('Failed to load group students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Export functions
  const handleExportStudent = async (studentId: number) => {
    try {
      const blob = await exportStudentReport(studentId.toString(), selectedCourse || undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `student_report_${studentId}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export student report:', error);
    }
  };

  const handleExportGroup = async (groupId: number) => {
    try {
      const blob = await exportGroupReport(groupId.toString());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `group_report_${groupId}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export group report:', error);
    }
  };

  const handleExportAllStudents = async () => {
    try {
      console.log('Starting export all students...');
      setIsLoading(true);
      
      const blob = await exportAllStudentsReport();
      console.log('Blob received:', blob, 'Size:', blob.size, 'Type:', blob.type);
      
      if (blob.size === 0) {
        console.error('Received empty blob!');
        alert('Error: Received empty file from server');
        return;
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const filename = `all_students_report_${new Date().toISOString().split('T')[0]}.pdf`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      console.log('Download triggered for:', filename);
      alert(`Report downloaded successfully: ${filename}\n\nCheck your Downloads folder!`);
      
    } catch (error) {
      console.error('Failed to export all students report:', error);
      alert(`Export failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewStudent = (studentId: number) => {
    setSelectedStudent(studentId.toString());
    setSelectedView('student');
  };

  const handleViewGroup = (groupId: number) => {
    setSelectedGroup(groupId.toString());
    // Can add a separate view for the group or show group students
  };

  const handleViewDetailedProgress = (studentId: number) => {
    setDetailedProgressStudentId(studentId);
    setSelectedView('detailed-progress');
  };

  const handleCloseDetailedProgress = () => {
    setDetailedProgressStudentId(null);
    setSelectedView('all-students');
  };

  if (!hasAnalyticsAccess) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground">You don't have permission to access analytics.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderOverviewTab = () => {
    if (!courseOverview) {
      return (
        <Card className="p-12">
          <div className="text-center">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Course Selected</h3>
            <p className="text-muted-foreground mb-4">Please select a course from the dropdown above to view analytics</p>
            <Badge variant="outline" className="text-sm">
              {courses.length} courses available
            </Badge>
          </div>
        </Card>
      );
    }

    const studentPerformanceData = courseOverview.student_performance.map(student => ({
      name: student.student_name.split(' ')[0],
      fullName: student.student_name,
      studentId: student.student_id,
      completion: student.completion_percentage,
      assignments: student.assignment_score_percentage,
      time: Math.round(student.time_spent_minutes / 60),
      completedSteps: student.completed_steps,
      totalSteps: student.total_steps_available
    }));

    // Calculate additional statistics
    const avgStudyTimePerStudent = courseOverview.engagement.total_enrolled_students > 0
      ? Math.round(courseOverview.engagement.total_time_spent_minutes / courseOverview.engagement.total_enrolled_students)
      : 0;
    
    const studentsAbove80 = courseOverview.student_performance.filter(s => s.completion_percentage >= 80).length;
    const studentsBelow50 = courseOverview.student_performance.filter(s => s.completion_percentage < 50).length;

    return (
      <div className="space-y-6">
        {/* Selected Course Info Banner */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">{courseOverview.course_info.title}</h2>
                </div>
                <p className="text-muted-foreground mb-4">
                  👨‍🏫 Teacher: {courseOverview.course_info.teacher_name}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="secondary" className="text-sm">
                    📚 {courseOverview.structure.total_modules} Modules
                  </Badge>
                  <Badge variant="secondary" className="text-sm">
                    📖 {courseOverview.structure.total_lessons} Lessons
                  </Badge>
                  <Badge variant="secondary" className="text-sm">
                    ⚡ {courseOverview.structure.total_steps} Steps
                  </Badge>
                  <Badge variant="secondary" className="text-sm">
                    👥 {courseOverview.engagement.total_enrolled_students} Students
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-2">
                  <span className="text-3xl font-bold text-primary">
                    {Math.round(courseOverview.engagement.average_completion_rate)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Avg Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Enrolled Students</p>
                  <p className="text-2xl font-bold">{courseOverview.engagement.total_enrolled_students}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Lessons</p>
                  <p className="text-2xl font-bold">{courseOverview.structure.total_lessons}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Study Hours</p>
                  <p className="text-2xl font-bold">{Math.round(courseOverview.engagement.total_time_spent_minutes / 60)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Completed Steps</p>
                  <p className="text-2xl font-bold">{courseOverview.engagement.total_completed_steps}</p>
                  <p className="text-xs text-muted-foreground">
                    of {courseOverview.structure.total_steps * courseOverview.engagement.total_enrolled_students} total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Time Per Student</p>
                  <p className="text-xl font-bold">{Math.floor(avgStudyTimePerStudent / 60)}h {avgStudyTimePerStudent % 60}m</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Excellent Students (≥80%)</p>
                  <p className="text-xl font-bold text-green-600">{studentsAbove80}</p>
                </div>
                <Award className="h-8 w-8 text-green-500/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Need Attention (&lt;50%)</p>
                  <p className="text-xl font-bold text-red-600">{studentsBelow50}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Student Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Student Performance Overview</CardTitle>
            <p className="text-sm text-muted-foreground">Click on any bar to view detailed student analytics</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={studentPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded shadow-lg">
                          <p className="font-medium">{data.fullName}</p>
                          <p className="text-sm">Progress: {Math.round(data.completion)}%</p>
                          <p className="text-sm">Steps: {data.completedSteps}/{data.totalSteps}</p>
                          <p className="text-sm">Assignments: {Math.round(data.assignments)}%</p>
                          <p className="text-sm">Study Time: {data.time}h</p>
                          <p className="text-xs text-blue-600 mt-1">🖱️ Click for detailed analytics</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="completion" 
                  fill="#8884d8" 
                  name="Completion %" 
                  onClick={(data: any) => {
                    if (data && data.payload && data.payload.studentId) {
                      handleViewDetailedProgress(data.payload.studentId);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <Bar 
                  dataKey="assignments" 
                  fill="#82ca9d" 
                  name="Assignment Score %" 
                  onClick={(data: any) => {
                    if (data && data.payload && data.payload.studentId) {
                      handleViewDetailedProgress(data.payload.studentId);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Groups Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Groups Performance in This Course</CardTitle>
            <p className="text-sm text-muted-foreground">Analytics by groups for this specific course</p>
          </CardHeader>
          <CardContent>
            {courseGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No groups with progress in this course yet</p>
              </div>
            ) : (
              <GroupsTable
                groups={courseGroups}
                isLoading={false}
                onViewGroup={handleViewGroup}
                onExportGroup={handleExportGroup}
                onExportAll={handleExportAllStudents}
              />
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderStudentTab = () => {
    if (!studentAnalytics) {
      return (
        <div className="text-center py-8">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Select a student to view detailed analytics</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Student Info */}
        <Card>
          <CardHeader>
            <CardTitle>Student Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold">{studentAnalytics.student_info.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Student ID</p>
                <p className="font-semibold">{studentAnalytics.student_info.student_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Daily Streak</p>
                <p className="font-semibold">{studentAnalytics.student_info.daily_streak} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Progress */}
        {studentAnalytics.courses.map((course) => (
          <Card key={course.course_id}>
            <CardHeader>
              <CardTitle>{course.course_title}</CardTitle>
              <p className="text-sm text-muted-foreground">Teacher: {course.teacher_name}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {course.modules.map((module) => (
                  <div key={module.module_id} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">{module.module_title}</h4>
                    <div className="space-y-2">
                      {module.lessons.map((lesson) => (
                        <div key={lesson.lesson_id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div>
                            <p className="font-medium">{lesson.lesson_title}</p>
                            <p className="text-sm text-muted-foreground">
                              {lesson.completed_steps}/{lesson.total_steps} steps completed
                            </p>
                          </div>
                          <div className="text-right">
                            <Progress value={(lesson.completed_steps / lesson.total_steps) * 100} className="w-20 mb-1" />
                            <p className="text-xs text-muted-foreground">{lesson.total_time_spent}m</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderVideoTab = () => {
    if (!videoAnalytics) return <div>Loading video analytics...</div>;

    const videoData = videoAnalytics.video_analytics.map((video: any) => ({
      name: video.step_title.substring(0, 20) + '...',
      views: video.total_views,
      completion: video.completion_rate,
      avgTime: video.average_watch_time_minutes
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <PlayCircle className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Videos</p>
                  <p className="text-2xl font-bold">{videoAnalytics.summary.total_videos}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Eye className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Views</p>
                  <p className="text-2xl font-bold">{videoAnalytics.summary.total_video_views}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Avg Completion</p>
                  <p className="text-2xl font-bold">{Math.round(videoAnalytics.summary.average_completion_rate)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Video Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={videoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="views" fill="#8884d8" name="Views" />
                <Bar dataKey="completion" fill="#82ca9d" name="Completion Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderQuizTab = () => {
    if (!quizAnalytics) return <div>Loading quiz analytics...</div>;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <HelpCircle className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Quizzes</p>
                  <p className="text-2xl font-bold">{quizAnalytics.summary.total_quizzes}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Award className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Quiz Steps</p>
                  <p className="text-2xl font-bold">{quizAnalytics.summary.total_quiz_steps}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quiz Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quizAnalytics.quiz_analytics.map((quiz: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{quiz.title}</h4>
                      <p className="text-sm text-muted-foreground">Type: {quiz.type}</p>
                    </div>
                    <Badge variant={quiz.completion_rate > 80 ? "default" : "secondary"}>
                      {Math.round(quiz.completion_rate || quiz.average_percentage || 0)}%
                    </Badge>
                  </div>
                  
                  {quiz.type === 'quiz_step' ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Attempts: </span>
                        <span className="font-medium">{quiz.total_attempts}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Completed: </span>
                        <span className="font-medium">{quiz.completed_attempts}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Submissions: </span>
                        <span className="font-medium">{quiz.total_submissions}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Score: </span>
                        <span className="font-medium">{Math.round(quiz.average_score || 0)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Max Score: </span>
                        <span className="font-medium">{quiz.max_score}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAllStudentsTab = () => {
    return (
      <StudentsTable
        students={allStudents}
        isLoading={isLoading}
        onViewStudent={handleViewStudent}
        onViewDetailedProgress={handleViewDetailedProgress}
        onExportStudent={handleExportStudent}
        onExportAll={handleExportAllStudents}
      />
    );
  };

  const renderDetailedProgressTab = () => {
    if (!detailedProgressStudentId) return null;
    
    return (
      <StudentDetailedProgress
        studentId={detailedProgressStudentId}
        courseId={selectedCourse ? parseInt(selectedCourse) : undefined}
        onClose={handleCloseDetailedProgress}
      />
    );
  };

  const renderGroupsTab = () => {
    if (selectedGroup && groupStudents.length > 0) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedGroup('');
                setGroupStudents([]);
              }}
            >
              ← Back to Groups
            </Button>
          </div>
          <StudentsTable
            students={groupStudents}
            isLoading={isLoading}
            onViewStudent={handleViewStudent}
            onExportStudent={handleExportStudent}
          />
        </div>
      );
    }

    return (
      <GroupsTable
        groups={groups}
        isLoading={isLoading}
        onViewGroup={handleViewGroup}
        onExportGroup={handleExportGroup}
        onExportAll={handleExportAllStudents}
      />
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive learning analytics and insights</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Course:</span>
            </div>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a course to analyze" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{course.title}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedView === 'student' && (
              <>
                <div className="flex items-center gap-2 ml-4">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Student:</span>
                </div>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.student_id} value={student.student_id.toString()}>
                        {student.student_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Tabs */}
      <div className="flex flex-wrap gap-1 mb-6">
        {[
          { key: 'overview', label: 'Course Overview', icon: BookOpen },
          { key: 'all-students', label: 'All Students', icon: Users },
          { key: 'groups', label: 'Groups', icon: Users },
          { key: 'student', label: 'Student Details', icon: Eye },
          { key: 'video', label: 'Video Analytics', icon: PlayCircle },
          { key: 'quiz', label: 'Quiz Performance', icon: HelpCircle }
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={selectedView === key ? "default" : "outline"}
            onClick={() => setSelectedView(key as any)}
            className="flex items-center"
          >
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </Button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading analytics...</p>
          </div>
        </div>
      ) : (
        <div>
          {selectedView === 'overview' && renderOverviewTab()}
          {selectedView === 'all-students' && renderAllStudentsTab()}
          {selectedView === 'groups' && renderGroupsTab()}
          {selectedView === 'detailed-progress' && renderDetailedProgressTab()}
          {selectedView === 'student' && renderStudentTab()}
          {selectedView === 'video' && renderVideoTab()}
          {selectedView === 'quiz' && renderQuizTab()}
        </div>
      )}
    </div>
  );
}
