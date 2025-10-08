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
      
      // Загружаем детальный прогресс
      const progressData = await getStudentDetailedProgress(studentId.toString(), courseId?.toString());
      setDetailedProgress(progressData);
      
      // Загружаем путь обучения если есть courseId
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
      case 'completed': return <Badge variant="default">Завершен</Badge>;
      case 'in_progress': return <Badge variant="secondary">В процессе</Badge>;
      case 'not_started': return <Badge variant="outline">Не начат</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Не указано';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins}м`;
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Загрузка детального прогресса...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!detailedProgress) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="flex items-center justify-center h-64">
          <p>Данные о прогрессе не найдены</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Заголовок */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Детальный прогресс студента
              </CardTitle>
              <div className="mt-2 space-y-1">
                <p className="text-lg font-medium">{detailedProgress.student_info.name}</p>
                <p className="text-sm text-muted-foreground">{detailedProgress.student_info.email}</p>
              </div>
            </div>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Закрыть
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Завершено шагов</p>
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
                <p className="text-sm font-medium text-muted-foreground">Прогресс</p>
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
                <p className="text-sm font-medium text-muted-foreground">Время обучения</p>
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
                <p className="text-sm font-medium text-muted-foreground">Период обучения</p>
                <p className="text-2xl font-bold">{detailedProgress.summary.study_period_days} дн.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Табы с детальной информацией */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Обзор по курсам</TabsTrigger>
          <TabsTrigger value="timeline" disabled={!learningPath}>Хронология</TabsTrigger>
          <TabsTrigger value="activity">Активность</TabsTrigger>
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
                                    Тип: {step.content_type} • Время: {step.progress.time_spent_minutes} мин
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(step.progress.status)}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {step.progress.status === 'completed' 
                                    ? `Завершен: ${formatDateTime(step.progress.completed_at)}`
                                    : step.progress.started_at 
                                      ? `Начат: ${formatDateTime(step.progress.started_at)}`
                                      : 'Не начат'
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
                  Хронология обучения
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Порядок прохождения шагов во времени
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
                            <span className="text-muted-foreground">Начато:</span>
                            <p>{formatDateTime(step.progress_info.started_at || step.progress_info.visited_at)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Завершено:</span>
                            <p>{formatDateTime(step.progress_info.completed_at)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Время:</span>
                            <p>{step.progress_info.time_spent_minutes} мин</p>
                          </div>
                          {step.progress_info.time_since_previous_step_minutes && (
                            <div>
                              <span className="text-muted-foreground">Пауза:</span>
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
              <CardTitle>Активность по дням</CardTitle>
              <p className="text-sm text-muted-foreground">Последние 30 дней</p>
            </CardHeader>
            <CardContent>
              {detailedProgress.daily_activity.length > 0 ? (
                <div className="space-y-3">
                  {detailedProgress.daily_activity.map((day: any) => (
                    <div key={day.date} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{new Date(day.date).toLocaleDateString('ru-RU')}</p>
                        <p className="text-sm text-muted-foreground">
                          {day.steps_completed} шагов завершено
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
                  Нет активности за последние 30 дней
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
