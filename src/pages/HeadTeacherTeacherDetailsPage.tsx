import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  ArrowLeft,
  BarChart3,
  MessageSquare,
  FileText,
  Calendar,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface MissedAttendanceItem {
  event_id: number;
  event_title: string;
  group_id: number;
  group_name: string;
  event_date: string;
  expected_count: number;
  recorded_count: number;
}

interface TeacherDetails {
  teacher_id: number;
  teacher_name: string;
  email: string;
  avatar_url: string | null;
  groups_count: number;
  students_count: number;
  grade_distribution: Array<{ score_range: string; count: number }>;
  activity_history: Array<{ date: string; submissions_graded: number }>;
  total_feedbacks: number;
  avg_score_given: number | null;
  missed_attendance_count?: number;
  missed_attendance_details?: MissedAttendanceItem[];
}

interface FeedbackItem {
  submission_id: number;
  student_name: string;
  assignment_title: string;
  score: number | null;
  max_score: number;
  feedback: string;
  graded_at: string;
}

interface AssignmentItem {
  assignment_id: number;
  title: string;
  group_name: string;
  due_date: string | null;
  total_submissions: number;
  graded_submissions: number;
  created_at: string;
}

export default function HeadTeacherTeacherDetailsPage() {
  const { courseId, teacherId } = useParams<{ courseId: string; teacherId: string }>();
  const navigate = useNavigate();
  
  const [teacherDetails, setTeacherDetails] = useState<TeacherDetails | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (courseId && teacherId) {
      loadTeacherDetails();
    }
  }, [courseId, teacherId]);

  useEffect(() => {
    if (courseId && teacherId && activeTab === 'feedbacks' && feedbacks.length === 0) {
      loadFeedbacks();
    }
    if (courseId && teacherId && activeTab === 'assignments' && assignments.length === 0) {
      loadAssignments();
    }
  }, [activeTab, courseId, teacherId]);

  const loadTeacherDetails = async () => {
    try {
      setLoadingDetails(true);
      const data = await apiClient.getHeadTeacherTeacherDetails(
        parseInt(courseId!),
        parseInt(teacherId!)
      );
      setTeacherDetails(data);
    } catch (error) {
      console.error('Failed to load teacher details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadFeedbacks = async () => {
    try {
      setLoadingFeedbacks(true);
      const data = await apiClient.getHeadTeacherTeacherFeedbacks(
        parseInt(courseId!),
        parseInt(teacherId!)
      );
      setFeedbacks(data.feedbacks);
    } catch (error) {
      console.error('Failed to load feedbacks:', error);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const loadAssignments = async () => {
    try {
      setLoadingAssignments(true);
      const data = await apiClient.getHeadTeacherTeacherAssignments(
        parseInt(courseId!),
        parseInt(teacherId!)
      );
      setAssignments(data.assignments);
    } catch (error) {
      console.error('Failed to load assignments:', error);
    } finally {
      setLoadingAssignments(false);
    }
  };

  if (loadingDetails) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-pulse text-slate-500">Loading teacher details...</div>
      </div>
    );
  }

  if (!teacherDetails) {
    return (
      <div className="p-8 text-center text-slate-500">
        Teacher not found
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/dashboard')} 
          className="w-fit pl-0 mb-2 hover:bg-slate-100 -ml-2 text-slate-600"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{teacherDetails.teacher_name}</h1>
            <p className="text-slate-500">{teacherDetails.email}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teacherDetails.students_count}</div>
            <p className="text-xs text-slate-400 mt-1">Across {teacherDetails.groups_count} groups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Feedbacks</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold text-blue-600">{teacherDetails.total_feedbacks}</div>
             <p className="text-xs text-slate-400 mt-1">Written comments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Avg Score Given</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (teacherDetails.avg_score_given || 0) > 80 ? 'text-emerald-600' : 
              (teacherDetails.avg_score_given || 0) > 60 ? 'text-amber-600' : 'text-slate-900'
            }`}>
              {teacherDetails.avg_score_given !== null ? teacherDetails.avg_score_given.toFixed(1) : '-'}
            </div>
            <p className="text-xs text-slate-400 mt-1">Average points</p>
          </CardContent>
        </Card>

        <Card>
           <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Missed Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(teacherDetails.missed_attendance_count || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {teacherDetails.missed_attendance_count || 0}
            </div>
            <p className="text-xs text-slate-400 mt-1">Unrecorded classes</p>
          </CardContent>
        </Card>
      </div>

      {/* Missed Attendance Alert */}
      {(teacherDetails.missed_attendance_details?.length || 0) > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-base text-red-900">Missing Attendance Records</CardTitle>
            </div>
            <CardDescription className="text-red-700">
              The following classes ended without complete attendance records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teacherDetails.missed_attendance_details?.map((item) => (
                <div 
                  key={`${item.event_id}-${item.group_id}`} 
                  className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-red-100"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.event_title}</p>
                    <p className="text-xs text-slate-500">
                      {item.group_name} • {new Date(item.event_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200">
                    {item.recorded_count}/{item.expected_count} recorded
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 max-w-xl">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="feedbacks" className="flex items-center gap-2">
             <MessageSquare className="h-4 w-4" /> Feedbacks
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Assignments
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Grade Distribution Chart */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Grade Distribution</CardTitle>
                  <CardDescription>How grades are distributed across assignments</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={teacherDetails.grade_distribution}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="score_range" 
                            tick={{ fontSize: 12, fill: '#64748b' }} 
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis 
                             allowDecimals={false}
                             tick={{ fontSize: 12, fill: '#64748b' }} 
                             axisLine={false}
                             tickLine={false}
                          />
                          <RechartsTooltip 
                             cursor={{ fill: 'transparent' }}
                             contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                            {teacherDetails.grade_distribution.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={index > 2 ? '#10b981' : index === 2 ? '#f59e0b' : '#ef4444'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Activity History Chart */}
             <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <CardDescription>Grading volume over the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={teacherDetails.activity_history}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
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
                             labelFormatter={(label) => new Date(label).toLocaleDateString()}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="submissions_graded" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Feedbacks Tab */}
        <TabsContent value="feedbacks">
           <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                   <CardTitle className="text-lg">Recent Feedbacks</CardTitle>
                   <CardDescription>History of feedback given to students</CardDescription>
                </div>
                {feedbacks.length > 0 && <Badge variant="outline" className="bg-slate-50 text-slate-600">{feedbacks.length} items</Badge>}
              </div>
            </CardHeader>
            <CardContent className="p-0">
               {loadingFeedbacks ? (
                <div className="p-12 flex justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : feedbacks.length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-slate-50/50 border-t border-slate-100">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  No feedbacks found in the recent history.
                </div>
              ) : (
                <div className="space-y-0 divide-y divide-slate-100">
                   {feedbacks.map((item) => (
                     <div key={item.submission_id} className="p-4 hover:bg-slate-50/50 transition-colors group">
                       <div className="flex items-start justify-between mb-2">
                         <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{item.student_name}</span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-sm text-slate-600">{item.assignment_title}</span>
                         </div>
                         <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.graded_at).toLocaleDateString()}
                         </div>
                       </div>
                       
                       <div className="mb-2">
                          <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-md border border-slate-100">
                            {item.feedback}
                          </p>
                       </div>
                       
                       <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100">
                             Score: {item.score}/{item.max_score}
                          </Badge>
                       </div>
                     </div>
                   ))}
                </div>
              )}
            </CardContent>
           </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
             <CardHeader className="pb-3">
               <div className="flex items-center justify-between">
                <div>
                   <CardTitle className="text-lg">Assignments Management</CardTitle>
                   <CardDescription>Overview of assignments managed by this teacher</CardDescription>
                </div>
                {assignments.length > 0 && <Badge variant="outline" className="bg-slate-50 text-slate-600">{assignments.length} assignments</Badge>}
               </div>
             </CardHeader>
             <CardContent className="p-0">
               {loadingAssignments ? (
                 <div className="p-12 flex justify-center">
                   <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                 </div>
               ) : assignments.length === 0 ? (
                 <div className="p-12 text-center text-slate-400 bg-slate-50/50 border-t border-slate-100">
                   <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                   No assignments found.
                 </div>
               ) : (
                 <Table>
                   <TableHeader>
                     <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                       <TableHead className="font-semibold text-slate-900">Assignment</TableHead>
                       <TableHead className="font-semibold text-slate-900">Group</TableHead>
                       <TableHead className="text-center font-semibold text-slate-900">Completion</TableHead>
                       <TableHead className="text-center font-semibold text-slate-900">Grading Status</TableHead>
                       <TableHead className="text-right font-semibold text-slate-900">Due Date</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {assignments.map((assignment) => {
                       const gradingProgress = assignment.total_submissions > 0 
                         ? (assignment.graded_submissions / assignment.total_submissions) * 100 
                         : 0;
                         
                       return (
                         <TableRow key={assignment.assignment_id} className="hover:bg-slate-50/50">
                           <TableCell className="font-medium">
                             <div className="flex items-center gap-2">
                               <FileText className="h-4 w-4 text-slate-400" />
                               {assignment.title}
                             </div>
                           </TableCell>
                           <TableCell>
                             <Badge variant="outline" className="font-normal text-slate-600">{assignment.group_name}</Badge>
                           </TableCell>
                           <TableCell className="text-center">
                             <div className="flex flex-col items-center gap-1">
                               <span className="text-sm font-medium">{assignment.total_submissions} submissions</span>
                             </div>
                           </TableCell>
                           <TableCell className="text-center">
                              <div className="w-full max-w-[120px] mx-auto">
                                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                  <span>{assignment.graded_submissions} graded</span>
                                  <span>{Math.round(gradingProgress)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${gradingProgress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                    style={{ width: `${gradingProgress}%` }}
                                  />
                                </div>
                              </div>
                           </TableCell>
                           <TableCell className="text-right">
                             {assignment.due_date ? (
                               <div className="flex items-center justify-end gap-1.5 text-slate-500">
                                   <Clock className="h-3.5 w-3.5" />
                                   <span className="text-sm">{new Date(assignment.due_date).toLocaleDateString()}</span>
                               </div>
                             ) : (
                               <span className="text-slate-400 text-sm">-</span>
                             )}
                           </TableCell>
                         </TableRow>
                       );
                     })}
                   </TableBody>
                 </Table>
               )}
             </CardContent>
            </Card>
          </div>
        </TabsContent>
        
      </Tabs>
    </div>
  );
}
