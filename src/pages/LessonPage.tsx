import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ChevronLeft, ChevronRight, Play, FileText, HelpCircle, ChevronDown, ChevronUp, BookOpen, CheckCircle, Edit3 } from 'lucide-react';
import apiClient from '../services/api';
import type { Lesson, Step, Course, CourseModule, StepProgress } from '../types';
import TextLessonEditor from '../components/lesson/TextLessonEditor';
import VideoLessonEditor from '../components/lesson/VideoLessonEditor';
import QuizLessonEditor from '../components/lesson/QuizLessonEditor';

interface LessonSidebarProps {
  course: Course | null;
  modules: CourseModule[];
  selectedLessonId: string;
  onLessonSelect: (lessonId: string) => void;
}

const LessonSidebar = ({ course, modules, selectedLessonId, onLessonSelect }: LessonSidebarProps) => {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [moduleLectures, setModuleLectures] = useState<Map<string, Lesson[]>>(new Map());
  const [stepsProgress, setStepsProgress] = useState<Map<string, StepProgress[]>>(new Map());

  // Update expanded modules when modules are loaded
  useEffect(() => {
    if (modules.length > 0) {
      setExpandedModules(new Set(modules.map(m => m.id.toString())));
    }
  }, [modules]);

  // Auto-expand module containing current lesson
  useEffect(() => {
    if (selectedLessonId && modules.length > 0 && moduleLectures.size > 0) {
      // Find which module contains the current lesson
      for (const [moduleId, lessons] of moduleLectures.entries()) {
        const hasCurrentLesson = lessons.some(lesson => lesson.id === selectedLessonId);
        if (hasCurrentLesson) {
          setExpandedModules(prev => new Set([...prev, moduleId]));
          break;
        }
      }
    }
  }, [selectedLessonId, modules, moduleLectures]);

  // Load lectures for all modules on component mount
  useEffect(() => {
    const loadAllLectures = async () => {
      try {
        console.log('Loading lessons for course:', course?.id);
        // Use optimized endpoint to get all lessons for the course
        const allLessons = await apiClient.getCourseLessons(course?.id || '');
        console.log('Loaded lessons:', allLessons);
        
        // Group lessons by module
        const lecturesMap = new Map<string, Lesson[]>();
        for (const lesson of allLessons) {
          const moduleId = lesson.module_id.toString();
          if (!lecturesMap.has(moduleId)) {
            lecturesMap.set(moduleId, []);
          }
          lecturesMap.get(moduleId)!.push(lesson);
        }
        
        console.log('Grouped lessons by module:', lecturesMap);
        setModuleLectures(lecturesMap);
      } catch (error) {
        console.error('Failed to load course lessons:', error);
      }
    };
    
    if (modules.length > 0 && course?.id) {
      loadAllLectures();
    }
  }, [modules, course?.id]);

  // Load steps progress for all lessons
  useEffect(() => {
    const loadStepsProgress = async () => {
      try {
        const progressMap = new Map<string, StepProgress[]>();
        
        for (const [moduleId, lessons] of moduleLectures.entries()) {
          for (const lesson of lessons) {
            try {
              const progress = await apiClient.getLessonStepsProgress(lesson.id.toString());
              progressMap.set(lesson.id.toString(), progress);
            } catch (error) {
              console.error(`Failed to load progress for lesson ${lesson.id}:`, error);
              progressMap.set(lesson.id.toString(), []);
            }
          }
        }
        
        setStepsProgress(progressMap);
      } catch (error) {
        console.error('Failed to load steps progress:', error);
      }
    };
    
    if (moduleLectures.size > 0) {
      loadStepsProgress();
    }
  }, [moduleLectures]);

  const toggleModuleExpanded = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  return (
    <div className="w-64 bg-background border-r h-screen flex flex-col">
      {/* Course Header - Fixed */}
      <div className="p-4 border-b bg-muted/20 flex-shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-lg truncate">{course?.title || 'Course'}</h2>
        </div>
      </div>
      
      {/* Modules and Lessons - Scrollable */}
      <div className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar">
        <div className="p-2">
          <div className="space-y-1">
            {modules
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
              .map((module, moduleIndex) => {
                const lectures = moduleLectures.get(module.id.toString()) || [];
                const isExpanded = expandedModules.has(module.id.toString());
                
                return (
                  <div key={module.id} className="space-y-1">
                    {/* Module Header */}
                    <button
                      onClick={() => toggleModuleExpanded(module.id.toString())}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left group ${
                        lectures.some(lesson => lesson.id === selectedLessonId)
                          ? 'bg-primary/10 border-l-2 border-primary'
                          : 'hover:bg-muted/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-7 h-7 bg-primary text-primary-foreground rounded-full text-xs font-semibold">
                          {moduleIndex + 1}
                        </span>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium text-foreground">{module.title}</span>
                          <span className="text-xs text-muted-foreground">{lectures.length} lesson{lectures.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </span>
                        {isExpanded ? 
                          <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" /> : 
                          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        }
                      </div>
                    </button>
                    
                    {/* Lessons List */}
                    {isExpanded && (
                      <div className="ml-4 space-y-1">
                        {lectures
                          .sort((a, b) => {
                            const orderA = a.order_index || 0;
                            const orderB = b.order_index || 0;
                            // If order_index is the same, use lesson ID for stable sorting
                            if (orderA === orderB) {
                              return parseInt(a.id) - parseInt(b.id);
                            }
                            return orderA - orderB;
                          })
                          .map((lecture, lectureIndex) => {
                            const isSelected = selectedLessonId === lecture.id;
                            const getLessonIcon = (steps: Step[] = []) => {
                              // Determine icon based on first step content type
                              if (steps.length > 0) {
                                switch (steps[0].content_type) {
                                  case 'video_text': return <Play className="w-4 h-4" />;
                                case 'quiz': return <HelpCircle className="w-4 h-4" />;
                                case 'text': return <FileText className="w-4 h-4" />;
                                default: return <Edit3 className="w-4 h-4" />;
                              }
                              }
                              return <Edit3 className="w-4 h-4" />;
                            };
                            
                            return (
                              <button
                                key={lecture.id}
                                onClick={() => onLessonSelect(lecture.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left text-sm transition-all duration-200 relative ${
                                  isSelected 
                                    ? 'bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/30 border-l-4 border-primary' 
                                    : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                {/* Active indicator */}
                                {isSelected && (
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>
                                )}
                                
                                <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                                  isSelected ? 'bg-primary-foreground/20' : 'bg-muted/50'
                                }`}>
                                  {getLessonIcon(lecture.steps || [])}
                                </div>
                                <div className="flex flex-col items-start flex-1 min-w-0">
                                  <span className={`font-medium truncate w-full ${
                                    isSelected ? 'text-primary-foreground' : ''
                                  }`}>
                                    {moduleIndex + 1}.{lectureIndex + 1} {lecture.title}
                                  </span>
                                  <div className="flex items-center gap-2 mt-1">
                                    {isSelected && (
                                      <span className="text-xs text-primary-foreground/80">
                                        Currently viewing
                                      </span>
                                    )}
                                    {lecture.steps && lecture.steps.length > 0 && (
                                      <span className="text-xs text-green-600 flex items-center gap-1">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        Has content
                                      </span>
                                    )}
                                    {/* Progress indicator */}
                                    {(() => {
                                      const lessonProgress = stepsProgress.get(lecture.id.toString()) || [];
                                      const completedSteps = lessonProgress.filter(p => p.status === 'completed').length;
                                      const totalSteps = lecture.steps?.length || 0;
                                      const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
                                      
                                      return totalSteps > 0 ? (
                                        <span className={`text-xs flex items-center gap-1 ${
                                          progressPercentage === 100 ? 'text-green-600' : 
                                          progressPercentage > 0 ? 'text-yellow-600' : 'text-gray-500'
                                        }`}>
                                          <div className={`w-2 h-2 rounded-full ${
                                            progressPercentage === 100 ? 'bg-green-500' : 
                                            progressPercentage > 0 ? 'bg-yellow-500' : 'bg-gray-400'
                                          }`}></div>
                                          {completedSteps}/{totalSteps} steps
                                        </span>
                                      ) : null;
                                    })()}
                                  </div>
                                </div>
                                {isSelected && (
                                  <CheckCircle className="w-4 h-4 flex-shrink-0 text-primary-foreground" />
                                )}
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function LessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepsProgress, setStepsProgress] = useState<StepProgress[]>([]);

  useEffect(() => {
    if (courseId && lessonId) {
      loadData();
    }
  }, [courseId, lessonId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load lesson with steps
      const lessonData = await apiClient.getLesson(lessonId!);
      setLesson(lessonData);
      
      // Load steps
      const stepsData = await apiClient.getLessonSteps(lessonId!);
      setSteps(stepsData);
      
      // Load course
      const courseData = await apiClient.getCourse(courseId!);
      setCourse(courseData);
      
      // Load modules for navigation
      const modulesData = await apiClient.getCourseModules(courseId!);
      setModules(modulesData);
      
      // Load steps progress
      try {
        const progressData = await apiClient.getLessonStepsProgress(lessonId!);
        setStepsProgress(progressData);
      } catch (error) {
        console.error('Failed to load steps progress:', error);
        setStepsProgress([]);
      }
      
    } catch (error) {
      console.error('Failed to load lesson data:', error);
      setError('Failed to load lesson data');
    } finally {
      setIsLoading(false);
    }
  };

  const markStepAsVisited = async (stepId: string) => {
    try {
      await apiClient.markStepVisited(stepId, 1); // 1 minute spent
      
      // Update local progress state
      setStepsProgress(prev => {
        const updated = [...prev];
        const existingIndex = updated.findIndex(p => p.step_id === parseInt(stepId));
        
        if (existingIndex >= 0) {
          updated[existingIndex] = {
            ...updated[existingIndex],
            status: 'completed',
            visited_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            time_spent_minutes: updated[existingIndex].time_spent_minutes + 1
          };
        } else {
          // Create new progress record
          updated.push({
            id: Date.now(), // Temporary ID
            user_id: 0, // Will be set by backend
            course_id: parseInt(courseId!),
            lesson_id: parseInt(lessonId!),
            step_id: parseInt(stepId),
            status: 'completed',
            visited_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            time_spent_minutes: 1
          });
        }
        
        return updated;
      });
    } catch (error) {
      console.error('Failed to mark step as visited:', error);
    }
  };

  const currentStep = steps[currentStepIndex];

  // Mark current step as visited when it changes
  useEffect(() => {
    if (currentStep && stepsProgress.length > 0) {
      const stepProgress = stepsProgress.find(p => p.step_id === currentStep.id);
      if (!stepProgress || stepProgress.status === 'not_started') {
        markStepAsVisited(currentStep.id.toString());
      }
    }
  }, [currentStepIndex, currentStep, stepsProgress]);

  const goToNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      // Mark current step as visited before moving to next
      if (currentStep) {
        markStepAsVisited(currentStep.id.toString());
      }
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      // Mark current step as visited before moving to previous
      if (currentStep) {
        markStepAsVisited(currentStep.id.toString());
      }
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const goToStep = (index: number) => {
    // Mark current step as visited before moving to another step
    if (currentStep) {
      markStepAsVisited(currentStep.id.toString());
    }
    setCurrentStepIndex(index);
  };

  const getStepIcon = (step: Step) => {
    switch (step.content_type) {
      case 'video_text':
        return <Play className="w-4 h-4" />;
      case 'quiz':
        return <HelpCircle className="w-4 h-4" />;
      case 'text':
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStepTitle = (step: Step) => {
    return step.title || `Step ${step.order_index}`;
  };

  const renderStepContent = () => {
    if (!currentStep) return null;

    switch (currentStep.content_type) {
      case 'text':
        return (
          <div className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: currentStep.content_text || '' }} />
          </div>
        );
      
      case 'video_text':
        return (
          <div className="space-y-4">
            {currentStep.video_url && (
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <iframe
                  src={currentStep.video_url}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            )}
            {currentStep.content_text && (
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: currentStep.content_text }} />
              </div>
            )}
          </div>
        );
      
      case 'quiz':
        try {
          const quizData = JSON.parse(currentStep.content_text || '{}');
          return (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{quizData.title || 'Quiz'}</h3>
              <p className="text-sm text-gray-600">
                {quizData.questions?.length || 0} questions
                {quizData.time_limit_minutes && ` • ${quizData.time_limit_minutes} minutes`}
              </p>
              <Button 
                onClick={() => navigate(`/quiz/${currentStep.id}`)}
                className="w-full"
              >
                Start Quiz
              </Button>
            </div>
          );
        } catch {
          return <div>Invalid quiz data</div>;
        }
      
      default:
        return <div>Unsupported content type</div>;
    }
  };

  const handleLessonSelect = (newLessonId: string) => {
    if (newLessonId !== lessonId) {
      navigate(`/course/${courseId}/lesson/${newLessonId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error || 'Lesson not found'}</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <LessonSidebar
        course={course}
        modules={modules}
        selectedLessonId={lessonId!}
        onLessonSelect={handleLessonSelect}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Card className="border-0 rounded-none border-b">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Dashboard</span>
                </Button>
                <div className="h-6 w-px bg-border" />
                
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={goToPreviousStep}
                  disabled={currentStepIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <Button
                  onClick={goToNextStep}
                  disabled={currentStepIndex === steps.length - 1}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
        
        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Steps Navigation */}
            <div className="mb-6">
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(15, 1fr)' }}>
                {steps
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((step, index) => {
                    const stepProgress = stepsProgress.find(p => p.step_id === step.id);
                    const isCompleted = stepProgress?.status === 'completed';
                    
                    return (
                      <button
                        key={step.id}
                        onClick={() => goToStep(index)}
                        className={`aspect-square rounded-md text-white p-1 relative shadow-sm hover:shadow-md transition-all cursor-pointer ${
                          currentStepIndex === index 
                            ? 'bg-blue-800 ring-2 ring-blue-400' 
                            : isCompleted
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-gray-500 hover:bg-gray-600'
                        }`}
                      >
                        <div className="h-full w-full flex flex-col items-start justify-end">
                          <div className="absolute top-1 left-1 text-[9px] bg-white/20 rounded px-1 py-0.5">
                            {step.order_index}
                          </div>
                          <div className="flex items-center gap-1 opacity-90">
                            {getStepIcon(step)}
                            {isCompleted && (
                              <CheckCircle className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Step Content */}
            <Card>
              <CardContent>
                <CardTitle className="text-lg font-bold py-4">{lesson.module_id}.{lesson.order_index} {lesson.title}</CardTitle>
                {currentStep ? (
                  <div className="min-h-[400px]">
                    {renderStepContent()}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No steps available for this lesson.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
