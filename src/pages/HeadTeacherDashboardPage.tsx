import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import Skeleton from '../components/Skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Users, CheckCheck, Clock, MessageSquare, Calendar } from 'lucide-react';

interface ManagedCourse {
  id: number;
  title: string;
  description: string | null;
  teacher_id: number | null;
  teacher_name: string | null;
  is_active: boolean;
  created_at: string;
}

interface TeacherStats {
  teacher_id: number;
  teacher_name: string;
  email: string;
  last_activity_date: string | null;
  groups_count: number;
  students_count: number;
  checked_homeworks_count: number;
  feedbacks_given_count: number;
  avg_grading_time_hours: number | null;
  quizzes_graded_count: number;
  homeworks_checked_last_7_days: number;
  homeworks_checked_last_30_days: number;
}

interface CourseTeachersData {
  course_id: number;
  course_title: string;
  date_range_start: string | null;
  date_range_end: string | null;
  teachers: TeacherStats[];
}

export default function HeadTeacherDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<ManagedCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [teachersData, setTeachersData] = useState<CourseTeachersData | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [days, setDays] = useState<number>(30);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadTeachersData(parseInt(selectedCourseId), days);
    }
  }, [selectedCourseId, days]);

  const loadCourses = async () => {
    try {
      setLoadingCourses(true);
      const res = await apiClient.getHeadTeacherManagedCourses();
      setCourses(res);
      if (res.length > 0) {
        setSelectedCourseId(res[0].id.toString());
      }
    } catch (error) {
      console.error('Failed to load managed courses:', error);
    } finally {
      setLoadingCourses(false);
    }
  };

  const loadTeachersData = async (courseId: number, daysRange: number) => {
    try {
      setLoadingTeachers(true);
      const res = await apiClient.getHeadTeacherCourseTeachers(courseId, daysRange);
      setTeachersData(res);
    } catch (error) {
      console.error('Failed to load teacher statistics:', error);
    } finally {
      setLoadingTeachers(false);
    }
  };

  if (loadingCourses) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const totalTeachers = teachersData?.teachers.length || 0;
  const totalStudents = teachersData?.teachers.reduce((sum, t) => sum + t.students_count, 0) || 0;
  const totalHomeworksChecked = teachersData?.teachers.reduce((sum, t) => sum + t.checked_homeworks_count, 0) || 0;
  const totalFeedbacks = teachersData?.teachers.reduce((sum, t) => sum + t.feedbacks_given_count, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="w-[220px] bg-white border-gray-200">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id.toString()}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
            <SelectTrigger className="w-[140px] bg-white border-gray-200">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 py-1.5 px-3">
            {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-600 to-purple-700 text-white border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-indigo-100">
              <p className="text-sm font-medium">Teachers</p>
            </div>
            <h3 className="text-3xl font-bold mt-2 text-white">{totalTeachers}</h3>
            <p className="mt-2 text-xs text-indigo-200">Managing "{teachersData?.course_title}"</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-gray-500">
              <p className="text-sm font-medium">Students</p>
            </div>
            <h3 className="text-3xl font-bold mt-2 text-gray-900">{totalStudents}</h3>
            <p className="mt-2 text-xs text-gray-500">Across all groups</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-gray-500">
              <p className="text-sm font-medium">HW Checked</p>
            </div>
            <h3 className="text-3xl font-bold mt-2 text-green-600">{totalHomeworksChecked}</h3>
            <p className="mt-2 text-xs text-gray-500">In selected period</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-gray-500">
              <p className="text-sm font-medium">Feedbacks Given</p>
            </div>
            <h3 className="text-3xl font-bold mt-2 text-blue-600">{totalFeedbacks}</h3>
            <p className="mt-2 text-xs text-gray-500">Written comments</p>
          </CardContent>
        </Card>
      </div>

      {/* Teacher Statistics Table */}
      <Card className="shadow-sm border overflow-hidden">
        <CardHeader className="bg-white">
          <CardTitle className="text-lg font-bold">
            Teacher Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingTeachers ? (
            <div className="p-8">
              <Skeleton className="h-64 w-full" />
            </div>
          ) : teachersData?.teachers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No teachers found for this course.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 text-gray-600 border-b border-gray-100">
                    <TableHead className="font-bold">Teacher</TableHead>
                    <TableHead className="text-center font-bold">Groups</TableHead>
                    <TableHead className="text-center font-bold">Students</TableHead>
                    <TableHead className="text-center font-bold">HW Checked</TableHead>
                    <TableHead className="text-center font-bold">Feedbacks</TableHead>
                    <TableHead className="text-center font-bold">Avg Grading Time</TableHead>
                    <TableHead className="text-center font-bold">Last 7 Days</TableHead>
                    <TableHead className="text-center font-bold">Last 30 Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachersData?.teachers.map((teacher) => (
                    <TableRow 
                      key={teacher.teacher_id} 
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/head-teacher/course/${selectedCourseId}/teacher/${teacher.teacher_id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div>
                            <span className="font-semibold text-gray-900">{teacher.teacher_name}</span>
                            <p className="text-xs text-gray-400">{teacher.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-gray-600 font-medium">
                        {teacher.groups_count}
                      </TableCell>
                      <TableCell className="text-center text-gray-600 font-medium">
                        {teacher.students_count}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-100">
                          {teacher.checked_homeworks_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                          {teacher.feedbacks_given_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {teacher.avg_grading_time_hours !== null ? (
                          <div className="flex items-center justify-center gap-1 text-gray-600">
                            <Clock className="h-3 w-3" />
                            <span className="text-sm">{teacher.avg_grading_time_hours}h</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={teacher.homeworks_checked_last_7_days > 0 ? "default" : "secondary"}
                          className={teacher.homeworks_checked_last_7_days > 0 
                            ? "bg-emerald-500 text-white" 
                            : "bg-gray-100 text-gray-500"
                          }
                        >
                          {teacher.homeworks_checked_last_7_days}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={teacher.homeworks_checked_last_30_days > 0 ? "default" : "secondary"}
                          className={teacher.homeworks_checked_last_30_days > 0 
                            ? "bg-indigo-500 text-white" 
                            : "bg-gray-100 text-gray-500"
                          }
                        >
                          {teacher.homeworks_checked_last_30_days}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Date Range Info */}
      {teachersData && teachersData.date_range_start && teachersData.date_range_end && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>
            Data from {new Date(teachersData.date_range_start).toLocaleDateString()} 
            {' '}to {new Date(teachersData.date_range_end).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}
