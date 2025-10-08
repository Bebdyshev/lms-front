import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Clock, 
  Calendar, 
  CheckCircle, 
  Play, 
  FileText, 
  HelpCircle, 
  TrendingUp,
  BarChart3,
  Activity
} from 'lucide-react';
import { getStudentDetailedProgress, getStudentLearningPath } from '../services/api';

interface StudentDetailedProgressProps {
  studentId: number;
  courseId?: number;
  onClose?: () => void;
}

interface StepProgress {
  step_id: number;
  step_title: string;
  step_order: number;
  content_type: string;
  progress: {
    status: string;
    visited_at: string | null;
    completed_at: string | null;
    time_spent_minutes: number;
    attempts: number;
  };
}

interface LearningPathStep {
  sequence_number: number;
  step_info: {
    id: number;
    title: string;
    content_type: string;
    order_index: number;
  };
  lesson_info: {
    id: number;
    title: string;
    order_index: number;
  };
  module_info: {
    id: number;
    title: string;
    order_index: number;
  };
  progress_info: {
    visited_at: string | null;
    completed_at: string | null;
    time_spent_minutes: number;
    status: string;
    time_since_previous_step_minutes: number | null;
  };
}

export default function StudentDetailedProgress({ 
  studentId, 
  courseId, 
  onClose 
}: StudentDetailedProgressProps) {
  const [detailedProgress, setDetailedProgress] = useState<any>(null);
  const [learningPath, setLearningPath] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, [studentId, courseId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load detailed progress
      const progressData = await getStudentDetailedProgress(studentId.toString(), courseId?.toString());
      setDetailedProgress(progressData);
      
      // Load learning path if courseId exists
      if (courseId) {
        const pathData = await getStudentLearningPath(studentId.toString(), courseId.toString());
        setLearningPath(pathData);
      }
      
    } catch (error) {
      console.error('Failed to load detailed progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStepIcon = (contentType: string) => {
    switch (contentType) {
      case 'video_text': return <Play className="w-4 h-4" />;
      case 'quiz': return <HelpCircle className="w-4 h-4" />;
      case 'text': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="default">Completed</Badge>;
      case 'in_progress': return <Badge variant="secondary">In Progress</Badge>;
      case 'not_started': return <Badge variant="outline">Not Started</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleString('en-US');
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading detailed progress...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!detailedProgress) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="flex items-center justify-center h-64">
          <p>Progress data not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Detailed Student Progress
              </CardTitle>
              <div className="mt-2 space-y-1">
                <p className="text-lg font-medium">{detailedProgress.student_info.name}</p>
                <p className="text-sm text-muted-foreground">{detailedProgress.student_info.email}</p>
              </div>
            </div>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Completed Steps</p>
                <p className="text-2xl font-bold">
                  {detailedProgress.summary.completed_steps}/{detailedProgress.summary.total_steps}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold">{Math.round(detailedProgress.summary.completion_percentage)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Study Time</p>
                <p className="text-2xl font-bold">{formatDuration(detailedProgress.summary.total_study_time_minutes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Study Period</p>
                <p className="text-2xl font-bold">{detailedProgress.summary.study_period_days} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Course Overview</TabsTrigger>
          <TabsTrigger value="timeline" disabled={!learningPath}>Timeline</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {Object.entries(detailedProgress.courses_progress).map(([courseId, courseData]: [string, any]) => (
            <Card key={courseId}>
              <CardHeader>
                <CardTitle>{courseData.course_info.title}</CardTitle>
                {courseData.course_info.description && (
                  <p className="text-sm text-muted-foreground">{courseData.course_info.description}</p>
                )}
              </CardHeader>
              <CardContent>
                {Object.entries(courseData.modules).map(([moduleId, moduleData]: [string, any]) => (
                  <div key={moduleId} className="mb-6">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">
                        {moduleData.module_info.order_index || 'M'}
                      </span>
                      {moduleData.module_info.title}
                    </h4>
                    
                    {Object.entries(moduleData.lessons).map(([lessonId, lessonData]: [string, any]) => (
                      <div key={lessonId} className="ml-8 mb-4">
                        <h5 className="font-medium mb-2 flex items-center gap-2">
                          <span className="bg-secondary text-secondary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                            {lessonData.lesson_info.order_index || 'L'}
                          </span>
                          {lessonData.lesson_info.title}
                        </h5>
                        
                        <div className="ml-6 space-y-2">
                          {lessonData.steps.map((step: StepProgress) => (
                            <div key={step.step_id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                {getStepIcon(step.content_type)}
                                <div>
                                  <p className="font-medium">{step.step_title}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Type: {step.content_type} • Time: {step.progress.time_spent_minutes} min
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(step.progress.status)}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {step.progress.status === 'completed' 
                                    ? `Completed: ${formatDateTime(step.progress.completed_at)}`
                                    : step.progress.started_at 
                                      ? `Started: ${formatDateTime(step.progress.started_at)}`
                                      : 'Not started'
                                  }
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          {learningPath && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Learning Timeline
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Chronological order of step completion
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {learningPath.learning_path.map((step: LearningPathStep, index: number) => (
                    <div key={step.sequence_number} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                          {step.sequence_number}
                        </div>
                        {index < learningPath.learning_path.length - 1 && (
                          <div className="w-0.5 h-12 bg-border mt-2"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 pb-8">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{step.step_info.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {step.module_info.title} → {step.lesson_info.title}
                            </p>
                          </div>
                          {getStatusBadge(step.progress_info.status)}
                        </div>
                        
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Started:</span>
                            <p>{formatDateTime(step.progress_info.started_at || step.progress_info.visited_at)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Completed:</span>
                            <p>{formatDateTime(step.progress_info.completed_at)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Time:</span>
                            <p>{step.progress_info.time_spent_minutes} min</p>
                          </div>
                          {step.progress_info.time_since_previous_step_minutes && (
                            <div>
                              <span className="text-muted-foreground">Break:</span>
                              <p>{formatDuration(step.progress_info.time_since_previous_step_minutes)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Activity</CardTitle>
              <p className="text-sm text-muted-foreground">Last 30 days</p>
            </CardHeader>
            <CardContent>
              {detailedProgress.daily_activity.length > 0 ? (
                <div className="space-y-3">
                  {detailedProgress.daily_activity.map((day: any) => (
                    <div key={day.date} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{new Date(day.date).toLocaleDateString('en-US')}</p>
                        <p className="text-sm text-muted-foreground">
                          {day.steps_completed} steps completed
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatDuration(day.time_spent_minutes)}</p>
                        <Progress 
                          value={(day.steps_completed / 10) * 100} 
                          className="w-20 h-2 mt-1" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No activity in the last 30 days
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
