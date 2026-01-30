import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
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
import { Calendar as CalendarIcon, ArrowRight, BarChart3, TrendingUp, Users } from 'lucide-react';
import { addDays, format, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '../lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import Skeleton from '../components/Skeleton';

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

interface ActivityHistoryItem {
  date: string;
  submissions_graded: number;
}

interface CourseTeachersData {
  course_id: number;
  course_title: string;
  date_range_start: string | null;
  date_range_end: string | null;
  teachers: TeacherStats[];
  daily_activity: ActivityHistoryItem[];
}

export default function HeadTeacherDashboardPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<ManagedCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [teachersData, setTeachersData] = useState<CourseTeachersData | null>(null);
  
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  
  // Date Range State
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId && dateRange?.from && dateRange?.to) {
      loadTeachersData(
        parseInt(selectedCourseId),
        dateRange.from.toISOString().split('T')[0],
        dateRange.to.toISOString().split('T')[0]
      );
    }
  }, [selectedCourseId, dateRange]);

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

  const loadTeachersData = async (courseId: number, startDate: string, endDate: string) => {
    try {
      setLoadingTeachers(true);
      // Pass 30 for days as fallback (ignored by backend when dates provided)
      const res = await apiClient.getHeadTeacherCourseTeachers(courseId, 30, startDate, endDate);
      setTeachersData(res);
    } catch (error) {
      console.error('Failed to load teacher statistics:', error);
    } finally {
      setLoadingTeachers(false);
    }
  };

  if (loadingCourses) {
    return (
      <div className="p-8 space-y-6">
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

  // Prepare chart data
  const activityData = teachersData?.daily_activity || [];
  
  // Sort teachers by activity for comparison chart (Top 10)
  const topTeachers = [...(teachersData?.teachers || [])]
    .sort((a, b) => b.checked_homeworks_count - a.checked_homeworks_count)
    .slice(0, 10);

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Head Teacher Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of teacher performance and course activity</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white p-2 rounded-xl border shadow-sm">
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="w-[240px] border-0 bg-transparent font-medium focus:ring-0">
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
          
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />

          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"ghost"}
                className={cn(
                  "w-[260px] justify-start text-left font-normal hover:bg-slate-50",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Teachers</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalTeachers}</div>
            <p className="text-xs text-slate-500 mt-1">Active in this course</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Students</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalStudents}</div>
            <p className="text-xs text-slate-500 mt-1">Across all groups</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Homework Checked</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalHomeworksChecked}</div>
            <p className="text-xs text-slate-500 mt-1">In selected period</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Feedbacks Given</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalFeedbacks}</div>
            <p className="text-xs text-slate-500 mt-1">Written comments</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Timeline */}
        <Card className="lg:col-span-2 border shadow-sm">
          <CardHeader>
            <CardTitle>Grading Activity</CardTitle>
            <CardDescription>Daily volume of graded assignments across the course</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {loadingTeachers ? (
                <div className="w-full h-full flex items-center justify-center">
                   <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : activityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData}>
                    <defs>
                      <linearGradient id="colorGraded" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => format(new Date(val), 'MMM dd')}
                      tick={{ fontSize: 12, fill: '#64748b' }} 
                      axisLine={false}
                      tickLine={false}
                      minTickGap={30}
                    />
                    <YAxis 
                       allowDecimals={false}
                       tick={{ fontSize: 12, fill: '#64748b' }} 
                       axisLine={false}
                       tickLine={false}
                    />
                    <RechartsTooltip 
                       contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                       labelFormatter={(label) => format(new Date(label), 'PPP')}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="submissions_graded" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorGraded)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <BarChart3 className="h-8 w-8 mb-2 opacity-50" />
                  <p>No activity data for this period</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Teachers Chart */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Top Active Teachers</CardTitle>
            <CardDescription>By homeworks checked</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {loadingTeachers ? (
                 <div className="w-full h-full flex items-center justify-center">
                   <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : topTeachers.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topTeachers} layout="vertical" margin={{ left: 0, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="teacher_name" 
                      type="category" 
                      width={100} 
                      tick={{ fontSize: 11, fill: '#64748b' }} 
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => val.split(' ')[0]} // Show first name only to save space
                    />
                    <RechartsTooltip
                       cursor={{ fill: '#f8fafc' }}
                       contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <Bar dataKey="checked_homeworks_count" name="Checked" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                   <Users className="h-8 w-8 mb-2 opacity-50" />
                   <p>No teacher data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle>Teacher Performance</CardTitle>
          <CardDescription>Detailed breakdown per teacher</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loadingTeachers ? (
            <div className="p-12 flex justify-center">
               <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : teachersData?.teachers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-50/50">
              No teachers found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="font-bold text-slate-900">Teacher</TableHead>
                    <TableHead className="text-center font-bold text-slate-900">Groups</TableHead>
                    <TableHead className="text-center font-bold text-slate-900">Students</TableHead>
                    <TableHead className="text-center font-bold text-slate-900">HW Checked</TableHead>
                    <TableHead className="text-center font-bold text-slate-900">Feedbacks</TableHead>
                    <TableHead className="text-center font-bold text-slate-900">Activity Trend</TableHead>
                    <TableHead className="text-right font-bold text-slate-900">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachersData?.teachers.map((teacher) => (
                    <TableRow 
                      key={teacher.teacher_id} 
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/head-teacher/course/${selectedCourseId}/teacher/${teacher.teacher_id}`)}
                    >
                       <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-slate-200">
                            <AvatarFallback className="bg-white text-slate-700 font-medium">
                              {teacher.teacher_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-semibold text-slate-900 block">{teacher.teacher_name}</span>
                            <span className="text-xs text-slate-500">{teacher.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium text-slate-600">
                        {teacher.groups_count}
                      </TableCell>
                      <TableCell className="text-center font-medium text-slate-600">
                        {teacher.students_count}
                      </TableCell>
                      <TableCell className="text-center">
                         <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200">
                           {teacher.checked_homeworks_count}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                         <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                           {teacher.feedbacks_given_count}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                         <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                           <span className={teacher.homeworks_checked_last_7_days > 0 ? "text-emerald-600 font-medium" : ""}>
                             {teacher.homeworks_checked_last_7_days} (7d)
                           </span>
                           <span className="text-slate-300">|</span>
                           <span>{teacher.homeworks_checked_last_30_days} (30d)</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-right">
                         <div className="flex justify-end">
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 group-hover:text-blue-600">
                             <ArrowRight className="h-4 w-4" />
                           </Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
