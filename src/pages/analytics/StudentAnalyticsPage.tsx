import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, CheckCircle2, Circle, ChevronDown, BookOpen } from 'lucide-react'; 
import apiClient from '@/services/api'; // Fixed default import

interface StepProgress {
  status: 'completed' | 'in_progress' | 'not_started';
  started_at: string | null;
  visited_at: string | null;
  completed_at: string | null;
  time_spent_minutes: number;
  attempts: number;
}

interface StepInfo {
  step_id: number;
  step_title: string;
  step_order: number;
  content_type: string;
  progress: StepProgress;
}

interface LessonData {
  lesson_info: {
    id: number;
    title: string;
    order_index: number;
  };
  steps: StepInfo[];
}

interface ModuleData {
  module_info: {
    id: number;
    title: string;
    order_index: number;
  };
  lessons: Record<string, LessonData>;
}

interface CourseProgress {
  course_info: {
    id: number;
    title: string;
    description: string;
  };
  modules: Record<string, ModuleData>;
}

interface DetailedProgress {
  courses: Record<string, CourseProgress>;
  student_info: {
    id: number;
    name: string;
    email: string;
  };
  total_stats: {
    total_steps: number;
    completed_steps: number;
    total_study_time: number;
    last_activity: string | null;
  };
}

export const StudentAnalyticsPage: React.FC = () => {
  const { studentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const courseId = searchParams.get('course_id');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DetailedProgress | null>(null);

  useEffect(() => {
    loadData();
  }, [studentId, courseId]);

  const loadData = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const response = await apiClient.getStudentDetailedProgress(studentId, courseId || undefined);
      setData(response);
    } catch (err) {
      console.error('Failed to load student details:', err);
      setError('Failed to load student detailed progress.');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-pulse text-gray-500">Loading student details...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 pl-0 hover:bg-transparent">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Analytics
          </Button>
          <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
            {error || "Student not found or no access."}
          </div>
        </div>
      </div>
    );
  }

  // Helper to sort and map records
  const getSortedModules = (courseData: CourseProgress) => {
    return Object.values(courseData.modules).sort((a, b) => a.module_info.order_index - b.module_info.order_index);
  };

  const getSortedLessons = (moduleData: ModuleData) => {
    // Sort lessons by id usually, or explicit order if available.
    // Assuming backend sorts map or we rely on ID.
    // In backend code, lessons dict key is lesson.id. 
    // We should rely on IDs or titles if no explicit order. 
    // Wait, backend response had order_index in module_info and lesson_info!
    return Object.values(moduleData.lessons).sort((a, b) => (a.lesson_info.order_index || 0) - (b.lesson_info.order_index || 0));
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit pl-0 mb-2 hover:bg-slate-100 -ml-2 text-slate-600">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Course Analytics
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{data.student_info?.name || 'Student Details'}</h1>
            <p className="text-slate-500">{data.student_info?.email}</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Study Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(data.total_stats?.total_study_time || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.total_stats?.completed_steps} <span className="text-sm text-slate-400 font-normal">/ {data.total_stats?.total_steps} steps</span>
            </div>
            {data.total_stats?.total_steps > 0 && (
              <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full" 
                  style={{ width: `${(data.total_stats.completed_steps / data.total_stats.total_steps) * 100}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Last Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold ">{formatDate(data.total_stats?.last_activity)}</div>
            <p className="text-xs text-slate-400 mt-1">Most recent action</p>
          </CardContent>
        </Card>
        <Card>
           <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Enrollment Status</CardTitle>
          </CardHeader>
          <CardContent>
             <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Curriculum Progress */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Detailed Progress</CardTitle>
          <CardDescription>Step-by-step breakdown of learning activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] overflow-y-auto pr-4">
            {Object.values(data.courses || {}).map((course) => (
              <div key={course.course_info.id} className="mb-8">
                {(!courseId) && <h3 className="text-lg font-semibold mb-4 text-slate-800">{course.course_info.title}</h3>}
                
                <div className="space-y-4">
                  {getSortedModules(course).map((module) => (
                    <div key={module.module_info.id} className="border border-slate-200 rounded-md overflow-hidden">
                      <details className="group">
                        <summary className="flex items-center justify-between p-4 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors list-none">
                            <div className="flex items-center">
                                <span className="font-semibold text-slate-700">Module {module.module_info.order_index}: {module.module_info.title}</span>
                            </div>
                            <ChevronDown className="h-5 w-5 text-slate-500 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="p-4 bg-white border-t border-slate-200">
                            <div className="space-y-6">
                              {getSortedLessons(module).map((lesson) => (
                                <div key={lesson.lesson_info.id} className="bg-slate-50/50 rounded-lg p-4 border border-slate-100">
                                    <h4 className="font-medium text-slate-900 mb-4 flex items-center">
                                        <BookOpen className="h-4 w-4 mr-2 text-slate-400"/>
                                        {lesson.lesson_info.title}
                                    </h4>
                                    <div className="space-y-1 pl-2 md:pl-6">
                                        {lesson.steps.sort((a,b) => a.step_order - b.step_order).map((step) => (
                                            <div key={step.step_id} className="group/step flex md:items-center justify-between text-sm py-3 border-b border-slate-100 last:border-0 hover:bg-white hover:shadow-sm px-3 rounded-md transition-all">
                                                <div className="flex md:items-center gap-3">
                                                    <div className="mt-0.5 md:mt-0">
                                                        {step.progress.status === 'completed' ? (
                                                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                                                        ) : step.progress.status === 'in_progress' ? (
                                                            <Circle className="h-5 w-5 text-blue-500 fill-blue-50 flex-shrink-0" />
                                                        ) : (
                                                            <Circle className="h-5 w-5 text-slate-300 flex-shrink-0" />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                                                        <span className={step.progress.status === 'completed' ? 'text-slate-700 font-medium' : 'text-slate-500'}>
                                                            {step.step_title}
                                                        </span>
                                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 px-1.5 py-0.5 border rounded border-slate-200 w-fit">{step.content_type.replace('_', ' ')}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col md:flex-row items-end md:items-center gap-1 md:gap-6 text-xs text-slate-400 flex-shrink-0 ml-4">
                                                    {step.progress.time_spent_minutes > 0 && (
                                                        <span className="flex items-center text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                                            <Clock className="h-3 w-3 mr-1" />
                                                            {formatDuration(step.progress.time_spent_minutes)}
                                                        </span>
                                                    )}
                                                    {step.progress.completed_at && (
                                                        <span className="hidden md:inline">{new Date(step.progress.completed_at).toLocaleDateString()}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                              ))}
                            </div>
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
                {/* Fallback if no modules */}
                {getSortedModules(course).length === 0 && (
                    <div className="text-center py-8 text-slate-400">No content structure found for this course.</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
