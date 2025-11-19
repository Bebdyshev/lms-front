import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ChevronLeft, ChevronRight, Play, FileText, HelpCircle, ChevronDown, ChevronUp, CheckCircle, Edit3 } from 'lucide-react';
import { Progress } from '../components/ui/progress';
import apiClient from '../services/api';
import type { Lesson, Step, Course, CourseModule, StepProgress, StepAttachment } from '../types';
import YouTubeVideoPlayer from '../components/YouTubeVideoPlayer';
import { renderTextWithLatex } from '../utils/latex';
import FlashcardViewer from '../components/lesson/FlashcardViewer';
import { FillInBlankRenderer } from '../components/lesson/FillInBlankRenderer';

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
        
        for (const [, lessons] of moduleLectures.entries()) {
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
    <div className="w-80 bg-card border-r border-border h-screen flex flex-col">
      <div className="p-6 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <img src={(import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000') + (course?.cover_image_url || '')} alt={course?.title} className="w-10 h-10 rounded-lg" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold truncate">{course?.title || 'Course'}</h2>
            <p className="text-xs text-muted-foreground">Lesson navigation</p>
          </div>
        </div>
        <Progress value={Math.min(100, Math.round(((Array.from(stepsProgress.values()).filter(arr => (arr||[]).every(p => p.status === 'completed')).length) / Math.max(1, Array.from(moduleLectures.values()).flat().length)) * 100))} className="h-2" />
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
                const completedInModule = lectures.filter(l => {
                  const prog = stepsProgress.get(l.id.toString()) || [];
                  const total = l.steps?.length || 0;
                  const done = prog.filter(p => p.status === 'completed').length;
                  return total > 0 && done >= total;
                }).length;
                
                return (
                  <div key={module.id} className="space-y-1">
                    {/* Module Header */}
                    <button
                      onClick={() => toggleModuleExpanded(module.id.toString())}
                      className={`w-full justify-between p-4 h-auto rounded-none border-b border-border/50 flex items-center text-left group ${
                        lectures.some(lesson => lesson.id === selectedLessonId)
                          ? 'bg-accent border-l-4 border-l-primary'
                          : 'hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-7 h-7 bg-primary text-primary-foreground rounded-full text-xs font-semibold">
                          {moduleIndex + 1}
                        </span>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium text-foreground">{module.title}</span>
                          <span className="text-xs text-muted-foreground">{completedInModule}/{lectures.length} lessons</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={lectures.length ? (completedInModule/lectures.length)*100 : 0} className="w-16 h-1" />
                        {isExpanded ? 
                          <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" /> : 
                          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        }
                      </div>
                    </button>
                    
                    {/* Lessons List */}
                    {isExpanded && (
                      <div className="bg-muted/30">
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
                                className={`w-full justify-start pl-12 pr-4 py-3 h-auto rounded-none border-b border-border/30 flex items-center gap-3 text-left text-sm ${
                                  isSelected ? 'bg-accent border-l-4 border-l-primary' : 'hover:bg-muted/60'
                                }`}
                              >
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted/50">
                                  {getLessonIcon(lecture.steps || [])}
                                </div>
                                <div className="flex items-center justify-between w-full min-w-0">
                                  <span className="truncate">{moduleIndex + 1}.{lectureIndex + 1} {lecture.title}</span>
                                  {(() => {
                                    const lessonProgress = stepsProgress.get(lecture.id.toString()) || [];
                                    const completedSteps = lessonProgress.filter(p => p.status === 'completed').length;
                                    const totalSteps = lecture.steps?.length || 0;
                                    const done = totalSteps > 0 && completedSteps >= totalSteps;
                                    return done ? (
                                      <span className="ml-2 h-5 px-2 inline-flex items-center rounded bg-accent text-primary border border-primary/20 text-[10px]">✓</span>
                                    ) : null;
                                  })()}
                                </div>
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
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepsProgress, setStepsProgress] = useState<StepProgress[]>([]);
  const [nextLessonId, setNextLessonId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [videoProgress, setVideoProgress] = useState<Map<string, number>>(new Map());
  const [quizCompleted, setQuizCompleted] = useState<Map<string, boolean>>(new Map());
  
  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Map<string, any>>(new Map());
  const [gapAnswers, setGapAnswers] = useState<Map<string, string[]>>(new Map());
  const [quizState, setQuizState] = useState<'title' | 'question' | 'result' | 'completed'>('title');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizData, setQuizData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [feedChecked, setFeedChecked] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (courseId && lessonId) {
      loadData();
    }
  }, [courseId, lessonId]);

  // Sync URL step parameter with currentStepIndex
  useEffect(() => {
    if (steps.length > 0) {
      const stepParam = searchParams.get('step');
      const stepNumber = stepParam ? parseInt(stepParam, 10) : 1;
      
      // Validate step number (1-based in URL, convert to 0-based for state)
      const validStepNumber = Math.max(1, Math.min(stepNumber, steps.length));
      const stepIndex = validStepNumber - 1;
      
      if (stepIndex !== currentStepIndex) {
        setCurrentStepIndex(stepIndex);
      }
    }
  }, [searchParams, steps.length, currentStepIndex]);

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
      
      // Resolve next lesson: prefer explicit pointer, else fallback to ordered list
      try {
        const allLessons = await apiClient.getCourseLessons(courseId!);
        const explicitNext = (lessonData as any).next_lesson_id;
        if (explicitNext) {
          setNextLessonId(String(explicitNext));
        } else {
          const ordered = Array.isArray(allLessons) ? allLessons : [];
          const currentIndex = ordered.findIndex((l: any) => String(l.id) === String(lessonId));
          const next = currentIndex >= 0 && currentIndex < ordered.length - 1 ? ordered[currentIndex + 1] : null;
          setNextLessonId(next ? String(next.id) : null);
        }
      } catch (e) {
        setNextLessonId(null);
      }
      
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

  const markStepAsStarted = async (stepId: string) => {
    try {
      await apiClient.markStepStarted(stepId);
      
      // Update local progress state
      setStepsProgress(prev => {
        const updated = [...prev];
        const existingIndex = updated.findIndex(p => p.step_id === parseInt(stepId));
        
        if (existingIndex >= 0) {
          updated[existingIndex] = {
            ...updated[existingIndex],
            status: 'in_progress',
            started_at: new Date().toISOString(),
            visited_at: new Date().toISOString()
          };
        } else {
          // Create new progress entry
          updated.push({
            id: Date.now(), // temporary ID
            user_id: 0, // will be set by backend
            course_id: 0, // will be set by backend
            lesson_id: 0, // will be set by backend
            step_id: parseInt(stepId),
            status: 'in_progress',
            started_at: new Date().toISOString(),
            visited_at: new Date().toISOString(),
            completed_at: undefined,
            time_spent_minutes: 0
          });
        }
        
        return updated;
      });
    } catch (error) {
      console.error('Failed to mark step as started:', error);
    }
  };

  const markStepAsVisited = async (stepId: string, timeSpent: number = 1) => {
    try {
      await apiClient.markStepVisited(stepId, timeSpent);
      
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
            time_spent_minutes: updated[existingIndex].time_spent_minutes + timeSpent
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

  // Check if step is completed based on content type
  const isStepCompleted = (step: Step): boolean => {
    const stepProgress = stepsProgress.find(p => p.step_id === step.id);
    if (!stepProgress) return false;

    switch (step.content_type) {
      case 'video_text':
        // Video step is completed if video is watched 90%+ and step is marked as completed
        const videoProgressValue = videoProgress.get(step.id.toString()) || 0;
        return stepProgress.status === 'completed' && videoProgressValue >= 0.9;
      
      case 'quiz':
        // Quiz step is completed if quiz is completed and step is marked as completed
        const isQuizCompleted = quizCompleted.get(step.id.toString()) || false;
        return stepProgress.status === 'completed' && isQuizCompleted;
      
      case 'text':
      default:
        // Text step is completed if it's marked as completed
        return stepProgress.status === 'completed';
    }
  };

  // Mark current step as started when it changes
  useEffect(() => {
    if (currentStep && stepsProgress.length > 0) {
      const stepProgress = stepsProgress.find(p => p.step_id === currentStep.id);
      if (!stepProgress || stepProgress.status === 'not_started') {
        markStepAsStarted(currentStep.id.toString());
      }
    }
  }, [currentStepIndex, currentStep, stepsProgress]);

  // Initialize quiz when quiz step is loaded
  useEffect(() => {
    if (currentStep?.content_type === 'quiz') {
      try {
        const parsedQuizData = JSON.parse(currentStep.content_text || '{}');
        setQuizData(parsedQuizData);
        setQuestions(parsedQuizData.questions || []);
        // Initialize gap answers map per question
        const init = new Map<string, string[]>();
        (parsedQuizData.questions || []).forEach((q: any) => {
          if (q.question_type === 'fill_blank') {
            const text = (q.content_text || q.question_text || '').toString();
            const gaps = Array.from(text.matchAll(/\[\[(.*?)\]\]/g));
            const answers: string[] = Array.isArray(q.correct_answer) ? q.correct_answer : (q.correct_answer ? [q.correct_answer] : []);
            init.set(q.id.toString(), new Array(Math.max(gaps.length, answers.length)).fill(''));
          }
        });
        setGapAnswers(init);
        
        // Use display_mode from quiz data to determine quiz behavior
        const displayMode = parsedQuizData.display_mode || 'one_by_one';
        if (displayMode === 'all_at_once') {
          setQuizState('question');
          setQuizStartTime(Date.now()); // Start timer for feed mode quizzes
        } else {
          setQuizState('title');
        }
        setCurrentQuestionIndex(0);
        setQuizAnswers(new Map());
        setFeedChecked(false);
      } catch (error) {
        console.error('Failed to parse quiz data:', error);
      }
    }
  }, [currentStep]);

  // Check if user can proceed to next step
  const canProceedToNext = (): boolean => {
    if (!currentStep) return false;
    
    const stepId = currentStep.id.toString();
    
    if (currentStep.content_type === 'video_text') {
      // For video steps, check if video is watched 90%+
      const progress = videoProgress.get(stepId) || 0; // progress is a fraction [0..1]
      return progress >= 0.9;
    } else if (currentStep.content_type === 'quiz') {
      // For quiz steps, check if quiz is completed
      return quizCompleted.get(stepId) || false;
    }
    
    // For other step types, allow proceeding
    return true;
  };

  const goToNextStep = () => {
    // Check if current step is completed
    if (currentStep && !canProceedToNext()) {
      let message = '';
      
      switch (currentStep.content_type) {
        case 'video_text':
          const videoProgressValue = videoProgress.get(currentStep.id.toString()) || 0; // fraction [0..1]
          const progressPercent = Math.round(videoProgressValue * 100);
          message = `Пожалуйста, досмотрите видео до конца (просмотрено ${progressPercent}%, требуется 90%+) перед переходом к следующему шагу.`;
          break;
        case 'quiz':
          message = 'Пожалуйста, завершите квиз перед переходом к следующему шагу.';
          break;
        default:
          message = 'Пожалуйста, завершите текущий шаг перед переходом к следующему.';
      }
      
      alert(message);
      return;
    }

    if (currentStepIndex < steps.length - 1) {
      goToStep(currentStepIndex + 1);
    } else if (nextLessonId) {
      navigate(`/course/${courseId}/lesson/${nextLessonId}`);
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1);
    }
  };

  const goToStep = (index: number) => {
    // Mark current step as visited before moving to another step
    if (currentStep) {
      markStepAsVisited(currentStep.id.toString(), 2); // 2 minutes for step completion
    }
    setCurrentStepIndex(index);
    
    // Update URL with step parameter (1-based)
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('step', (index + 1).toString());
    setSearchParams(newSearchParams);
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


  // Quiz functions
  const startQuiz = () => {
    setQuizState('question');
    setQuizStartTime(Date.now());
  };

  const saveQuizAttempt = async (score: number, totalQuestions: number) => {
    if (!currentStep || !courseId || !lessonId) return;
    
    try {
      const timeSpentSeconds = quizStartTime 
        ? Math.floor((Date.now() - quizStartTime) / 1000)
        : undefined;
      
      const attemptData = {
        step_id: parseInt(currentStep.id.toString()),
        course_id: parseInt(courseId),
        lesson_id: parseInt(lessonId),
        quiz_title: quizData?.title || 'Quiz',
        total_questions: totalQuestions,
        correct_answers: score,
        score_percentage: (score / totalQuestions) * 100,
        answers: JSON.stringify(Array.from(quizAnswers.entries())),
        time_spent_seconds: timeSpentSeconds
      };
      
      await apiClient.saveQuizAttempt(attemptData);
      console.log('Quiz attempt saved successfully');
    } catch (error) {
      console.error('Failed to save quiz attempt:', error);
    }
  };

  const handleQuizAnswer = (questionId: string, answer: any) => {
    setQuizAnswers(prev => new Map(prev.set(questionId, answer)));
  };

  const checkAnswer = () => {
    // Always show result first, regardless of step position
    setQuizState('result');
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setQuizState('question');
    } else {
      // Save quiz attempt before completing
      const score = getScore();
      const scorePercentage = (score / questions.length) * 100;
      saveQuizAttempt(score, questions.length);
      
      // Always show completed state first, regardless of pass/fail or step position
      setQuizState('completed');
      
      // Mark quiz completion status
      if (currentStep) {
        const passed = scorePercentage >= 50;
        setQuizCompleted(prev => new Map(prev.set(currentStep.id.toString(), passed)));
        if (passed) {
          markStepAsVisited(currentStep.id.toString(), 3); // 3 minutes for quiz completion
        }
      }
    }
  };

  const resetQuiz = () => {
    setQuizState('title');
    setCurrentQuestionIndex(0);
    setQuizAnswers(new Map());
    setQuizStartTime(null);
    // Reset quiz completion status for current step
    if (currentStep) {
      setQuizCompleted(prev => new Map(prev.set(currentStep.id.toString(), false)));
    }
  };

  const getCurrentQuestion = () => {
    return questions[currentQuestionIndex];
  };

  const getCurrentUserAnswer = () => {
    const question = getCurrentQuestion();
    return question ? quizAnswers.get(question.id) : undefined;
  };

  const isCurrentAnswerCorrect = () => {
    const question = getCurrentQuestion();
    if (!question) return false;
    
    if (question.question_type === 'fill_blank') {
      // For fill_blank questions, check all gaps
      const userAnswers = gapAnswers.get(question.id.toString()) || [];
      const correctAnswers: string[] = Array.isArray(question.correct_answer) 
        ? question.correct_answer 
        : (question.correct_answer ? [question.correct_answer] : []);
      
      return userAnswers.length === correctAnswers.length &&
        userAnswers.every((userAns, idx) => 
          (userAns || '').toString().trim().toLowerCase() === 
          (correctAnswers[idx] || '').toString().trim().toLowerCase()
        );
    }
    
    const userAnswer = getCurrentUserAnswer();
    return userAnswer === question.correct_answer;
  };

  const getScore = () => {
    let score = 0;
    
    // Check all questions
    questions.forEach(question => {
      if (question.question_type === 'fill_blank') {
        // For fill_blank questions, use gapAnswers and count partial credit
        const userAnswers = gapAnswers.get(question.id.toString()) || [];
        const correctAnswers: string[] = Array.isArray(question.correct_answer) 
          ? question.correct_answer 
          : (question.correct_answer ? [question.correct_answer] : []);
        
        // Count how many gaps are correct
        let correctGaps = 0;
        const totalGaps = Math.min(userAnswers.length, correctAnswers.length);
        
        userAnswers.forEach((userAns, idx) => {
          if (idx < correctAnswers.length) {
            const isGapCorrect = (userAns || '').toString().trim().toLowerCase() === 
              (correctAnswers[idx] || '').toString().trim().toLowerCase();
            if (isGapCorrect) correctGaps++;
          }
        });
        
        // Award partial credit: correctGaps / totalGaps
        const partialScore = totalGaps > 0 ? correctGaps / totalGaps : 0;
        score += partialScore;
      } else {
        // For other question types, use quizAnswers
        const answer = quizAnswers.get(question.id);
        if (answer !== undefined && answer === question.correct_answer) {
          score++;
        }
      }
    });
    
    return score;
  };

  // Get detailed gap statistics for display
  const getGapStatistics = () => {
    let totalGaps = 0;
    let correctGaps = 0;
    let regularQuestions = 0;
    let correctRegular = 0;
    
    questions.forEach(question => {
      if (question.question_type === 'fill_blank') {
        const userAnswers = gapAnswers.get(question.id.toString()) || [];
        const correctAnswers: string[] = Array.isArray(question.correct_answer) 
          ? question.correct_answer 
          : (question.correct_answer ? [question.correct_answer] : []);
        
        const gaps = Math.min(userAnswers.length, correctAnswers.length);
        totalGaps += gaps;
        
        userAnswers.forEach((userAns, idx) => {
          if (idx < correctAnswers.length) {
            const isGapCorrect = (userAns || '').toString().trim().toLowerCase() === 
              (correctAnswers[idx] || '').toString().trim().toLowerCase();
            if (isGapCorrect) correctGaps++;
          }
        });
      } else {
        regularQuestions++;
        const answer = quizAnswers.get(question.id);
        if (answer !== undefined && answer === question.correct_answer) {
          correctRegular++;
        }
      }
    });
    
    return { totalGaps, correctGaps, regularQuestions, correctRegular };
  };

  // Feed mode renderer: show all questions vertically when quiz is not the last step
  const renderQuizFeed = () => {
    if (!questions || questions.length === 0) return null;
    
    return (
      <div className="max-w-3xl mx-auto space-y-6 p-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Quick Practice</h2>
          <p className="text-gray-600">Answer all questions below to continue</p>
        </div>

        {/* Quiz-level Media for Audio/PDF/Text Quizzes */}
        {quizData?.quiz_media_url && (
          <div className="bg-white rounded-lg shadow-md border p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              {quizData.quiz_media_type === 'audio' ? 'Audio Material' : 
               quizData.quiz_media_type === 'text' ? 'Reading Passage' : 
               'Reference Material'}
            </h3>
            {quizData.quiz_media_type === 'audio' ? (
              <audio 
                controls 
                src={(import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000') + quizData.quiz_media_url}
                className="w-full"
              />
            ) : quizData.quiz_media_type === 'text' ? (
              <div className="prose prose-lg max-w-none bg-gray-50 p-6 rounded-lg border">
                <div dangerouslySetInnerHTML={{ __html: renderTextWithLatex(quizData.quiz_media_url) }} />
              </div>
            ) : quizData.quiz_media_type === 'pdf' ? (
              // Check if it's actually a PDF or an image
              quizData.quiz_media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <img
                    src={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}${quizData.quiz_media_url}`}
                    alt="Reference material"
                    className="w-full h-auto rounded-lg"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Reference this image to answer the questions below.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="w-full h-[800px] border rounded-lg">
                    <iframe
                      src={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}${quizData.quiz_media_url}#toolbar=0&navpanes=0&scrollbar=1`}
                      className="w-full h-full"
                      title="Question PDF"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Reference this document to answer the questions below.
                  </p>
                </div>
              )
            ) : null}
          </div>
        )}

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const userAnswer = quizAnswers.get(q.id);
            return (
              <div key={q.id} className="bg-white border border-gray-200 rounded-xl shadow-md">
                <div className="p-6">
                  {/* Question Number Badge */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {idx + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-500">
                      Question {idx + 1} of {questions.length}
                    </span>
                  </div>

                  {/* Media Attachment for Media Questions */}
                  {q.question_type === 'media_question' && q.media_url && (
                    <div className="mb-4">
                      {q.media_type === 'pdf' ? (
                        <iframe
                          src={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}${q.media_url}#toolbar=0&navpanes=0&scrollbar=1`}
                          className="w-full h-64 border rounded-lg"
                          title="Question PDF"
                        />
                      ) : (
                        <img 
                          src={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}${q.media_url}`}
                          alt="Question media" 
                          className="w-full max-h-64 object-contain rounded-lg border"
                        />
                      )}
                    </div>
                  )}

                  {/* Content Text */}
                  {q.content_text && q.question_type !== 'text_completion' && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-4 border-l-3 border-blue-400">
                      <div className="text-gray-700" dangerouslySetInnerHTML={{ __html: renderTextWithLatex(q.content_text) }} />
                    </div>
                  )}

                  {/* Question */}
                  {q.question_type !== 'text_completion' && (
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      <span dangerouslySetInnerHTML={{ __html: renderTextWithLatex(q.question_text.replace(/\[\[.*?\]\]/g, '')) }} />
                    </h3>
                  )}

                  {q.question_type === 'text_completion' && (
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Fill in the blanks:
                    </h3>
                  )}

                  {/* Answer Input Based on Question Type */}
                  {q.question_type === 'long_text' ? (
                    <div className="space-y-4">
                      <textarea
                        value={userAnswer || ''}
                        onChange={(e) => setQuizAnswers(prev => new Map(prev.set(q.id.toString(), e.target.value)))}
                        placeholder="Enter your detailed answer here..."
                        className="w-full h-32 p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-vertical"
                        maxLength={q.expected_length || 1000}
                        disabled={feedChecked}
                      />
                      {q.expected_length && (
                        <div className="text-sm text-gray-500 text-right">
                          {(userAnswer || '').length} / {q.expected_length} characters
                        </div>
                      )}
                      {q.keywords && q.keywords.length > 0 && (
                        <div className="text-sm text-gray-600">
                          <strong>Hint:</strong> Try to include these concepts: {q.keywords.join(', ')}
                        </div>
                      )}
                    </div>
                  ) : q.question_type === 'short_answer' ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={userAnswer || ''}
                        onChange={(e) => setQuizAnswers(prev => new Map(prev.set(q.id.toString(), e.target.value)))}
                        placeholder="Enter your answer..."
                        className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        disabled={feedChecked}
                      />
                      {feedChecked && (
                        <div className="mt-2 text-sm">
                          {(userAnswer || '').toString().trim().toLowerCase() === (q.correct_answer || '').toString().trim().toLowerCase() ? (
                            <span className="text-green-700">Correct answer! ✓</span>
                          ) : (
                            <div className="text-red-700">
                              <div>Incorrect answer.</div>
                              <div className="mt-1">
                                <strong>Correct answer:</strong> {q.correct_answer}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : q.question_type === 'text_completion' ? (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                      <div className="leading-relaxed">
                        {(() => {
                          const text = (q.content_text || '').toString();
                          const parts = text.split(/\[\[(.*?)\]\]/g);
                          let gapIndex = 0;
                          const currentAnswers = gapAnswers.get(q.id.toString()) || [];
                          
                          return (
                            <div className="flex flex-wrap items-baseline gap-1">
                              {parts.map((part: string, index: number) => {
                                const isGap = index % 2 === 1;
                                if (!isGap) {
                                  return <span key={index} dangerouslySetInnerHTML={{ __html: renderTextWithLatex(part) }} />;
                                }
                                const currentGapIndex = gapIndex++;
                                return (
                                  <input
                                    key={index}
                                    type="text"
                                    value={currentAnswers[currentGapIndex] || ''}
                                    onChange={(e) => {
                                      const newAnswers = [...currentAnswers];
                                      newAnswers[currentGapIndex] = e.target.value;
                                      setGapAnswers(prev => new Map(prev.set(q.id.toString(), newAnswers)));
                                    }}
                                    className="inline-block mx-1 px-2 py-1 border-b-2 border-blue-500 bg-transparent text-center w-[120px] focus:outline-none focus:border-blue-700"
                                    disabled={feedChecked}
                                  />
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                      {feedChecked && (
                        <div className="mt-3 text-sm">
                          {(() => {
                            const correctAnswers: string[] = Array.isArray(q.correct_answer) ? q.correct_answer : (q.correct_answer ? [q.correct_answer] : []);
                            const userAnswers = gapAnswers.get(q.id.toString()) || [];
                            const isCorrect = userAnswers.length === correctAnswers.length && 
                              userAnswers.every((val, idx) => (val||'').trim().toLowerCase() === (correctAnswers[idx]||'').toString().trim().toLowerCase());
                            
                            if (isCorrect) {
                              return <span className="text-green-700">All blanks correct! ✓</span>;
                            } else {
                              return (
                                <div className="text-red-700">
                                  <div className="mt-1">
                                    <strong>Correct answers:</strong> {correctAnswers.join(', ')}
                                  </div>
                                </div>
                              );
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  ) : q.question_type === 'single_choice' || q.question_type === 'multiple_choice' || q.question_type === 'media_question' ? (
                    <div className="space-y-2">
                      {q.options?.map((option: any, optionIndex: number) => {
                        const isSelected = userAnswer === optionIndex;
                        const isCorrectOption = optionIndex === q.correct_answer;
                        
                        let buttonClass = "w-full text-left p-3 rounded-lg border-2 transition-all duration-200";
                        
                        if (feedChecked) {
                          if (isCorrectOption) {
                            buttonClass += " bg-green-50 border-green-400";
                          } else if (isSelected) {
                            buttonClass += " bg-red-50 border-red-400";
                          } else {
                            buttonClass += " bg-gray-50 border-gray-200";
                          }
                        } else {
                          if (isSelected) {
                            buttonClass += " bg-blue-50 border-blue-400";
                          } else {
                            buttonClass += " bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300";
                          }
                        }
                        
                        return (
                          <button
                            key={option.id}
                            onClick={() => setQuizAnswers(prev => new Map(prev.set(q.id.toString(), optionIndex)))}
                            disabled={feedChecked}
                            className={buttonClass}
                          >
                            <div className="flex items-center space-x-3">
                              {/* Custom Radio/Status Button */}
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                feedChecked
                                  ? isCorrectOption
                                    ? "bg-green-500 border-green-500"
                                    : isSelected
                                      ? "bg-red-500 border-red-500"
                                      : "border-gray-300 bg-white"
                                  : isSelected
                                    ? "bg-blue-500 border-blue-500"
                                    : "border-gray-300 bg-white"
                              }`}>
                                {feedChecked ? (
                                  isCorrectOption ? (
                                    <CheckCircle className="w-3 h-3 text-white" />
                                  ) : isSelected ? (
                                    <div className="text-white text-xs font-bold">✗</div>
                                  ) : null
                                ) : (
                                  isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>
                                )}
                              </div>
                              
                              {/* Option Letter */}
                              <span className={`text-base font-bold ${
                                feedChecked
                                  ? isCorrectOption ? "text-green-700" : isSelected ? "text-red-700" : "text-gray-600"
                                  : isSelected ? "text-blue-700" : "text-gray-600"
                              }`}>
                                {option.letter}.
                              </span>
                              
                              {/* Option Text */}
                              <span className={`text-base flex-1 ${
                                feedChecked
                                  ? isCorrectOption ? "text-green-800" : isSelected ? "text-red-800" : "text-gray-700"
                                  : isSelected ? "text-gray-900" : "text-gray-700"
                              }`} dangerouslySetInnerHTML={{ __html: renderTextWithLatex(option.text) }} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(() => {
                        const answers: string[] = Array.isArray(q.correct_answer) ? q.correct_answer : (q.correct_answer ? [q.correct_answer] : []);
                        const current = gapAnswers.get(q.id.toString()) || new Array(answers.length).fill('');
                        
                        // Convert current array to object for FillInBlankRenderer
                        const answersObj: Record<number, string> = {};
                        current.forEach((val, idx) => {
                          answersObj[idx] = val;
                        });
                        
                        return (
                          <div className="p-3 border rounded-md">
                            <FillInBlankRenderer
                              text={q.content_text || q.question_text || ''}
                              separator={q.gap_separator || ','}
                              answers={answersObj}
                              onAnswerChange={(gapIndex: number, value: string) => {
                                const next = [...current];
                                next[gapIndex] = value;
                                setGapAnswers(prev => new Map(prev.set(q.id.toString(), next)));
                              }}
                              disabled={feedChecked}
                              showCorrectAnswers={feedChecked}
                              correctAnswers={answers}
                              shuffleOptions={true}
                            />
                            {feedChecked && (
                              <div className="mt-2 text-sm">
                                {current.every((val, idx) => (val||'').trim().toLowerCase() === (answers[idx]||'').toString().trim().toLowerCase()) ? (
                                  <span className="text-green-700">All gaps correct</span>
                                ) : (
                                  <span className="text-red-700">Some answers are incorrect. Correct: {answers.join(', ')}</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Result Indicator */}
                   {feedChecked && (() => {
                     let isCorrect = false;
                     if (q.question_type === 'fill_blank') {
                       const answers: string[] = Array.isArray(q.correct_answer) ? q.correct_answer : (q.correct_answer ? [q.correct_answer] : []);
                       const current = gapAnswers.get(q.id.toString()) || new Array(answers.length).fill('');
                       isCorrect = current.every((val, idx) => (val||'').toString().trim().toLowerCase() === (answers[idx]||'').toString().trim().toLowerCase());
                     } else {
                       isCorrect = userAnswer === q.correct_answer;
                     }
                     return (
                       <div className="mt-4 flex items-center gap-2">
                         {isCorrect ? (
                           <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                             <CheckCircle className="w-4 h-4" />
                             Correct!
                           </span>
                         ) : (
                           <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                             <div className="w-4 h-4 text-red-600 font-bold">✗</div>
                             Incorrect
                           </span>
                         )}
                       </div>
                     );
                   })()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center pt-4">
          {!feedChecked ? (
            <button
              onClick={() => {
                setFeedChecked(true);
                // Save quiz attempt when checking all answers
                const score = getScore();
                saveQuizAttempt(score, questions.length);
              }}
              disabled={questions.some(q => {
                const ans = quizAnswers.get(q.id);
                if (q.question_type === 'fill_blank') {
                  return !ans || (ans || '').toString().trim() === '';
                }
                if (q.question_type === 'text_completion') {
                  const gapAns = gapAnswers.get(q.id.toString()) || [];
                  return gapAns.length === 0 || gapAns.some(v => (v||'').toString().trim() === '');
                }
                if (q.question_type === 'short_answer' || q.question_type === 'long_text') {
                  return !ans || (ans || '').toString().trim() === '';
                }
                return ans === undefined;
              })}
              className={`px-8 py-3 rounded-lg text-lg font-semibold transition-all duration-200 ${
                questions.some(q => {
                  const ans = quizAnswers.get(q.id);
                  if (q.question_type === 'fill_blank') {
                    return !ans || (ans || '').toString().trim() === '';
                  }
                  if (q.question_type === 'text_completion') {
                    const gapAns = gapAnswers.get(q.id.toString()) || [];
                    return gapAns.length === 0 || gapAns.some(v => (v||'').toString().trim() === '');
                  }
                  if (q.question_type === 'short_answer' || q.question_type === 'long_text') {
                    return !ans || (ans || '').toString().trim() === '';
                  }
                  return ans === undefined;
                })
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg"
              }`}
            >
              Check All Answers
            </button>
          ) : (() => {
              const score = getScore();
              const scorePercentage = (score / questions.length) * 100;
              const isPassed = scorePercentage >= 50;
              
              return (
                <div className="space-y-4">
                  {!isPassed && (
                    <div className="p-4 bg-red-100 border border-red-300 rounded-lg mb-4">
                      <p className="text-red-900 font-semibold text-center">
                        Score: {Math.round(scorePercentage)}% (minimum 50% required to continue)
                      </p>
                      <p className="text-red-800 text-sm mt-2 text-center">
                        Please try again to improve your score
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (isPassed) {
                        // Mark quiz as completed and step as completed before going to next step
                        if (currentStep) {
                          setQuizCompleted(prev => new Map(prev.set(currentStep.id.toString(), true)));
                          markStepAsVisited(currentStep.id.toString(), 4); // 4 minutes for quiz completion
                        }
                        goToNextStep();
                      } else {
                        // Reset quiz to retry
                        resetQuiz();
                        setFeedChecked(false);
                      }
                    }}
                    className={`px-8 py-3 rounded-lg text-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 ${
                      isPassed
                        ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    }`}
                  >
                    {isPassed ? 'Continue to Next Step' : 'Retry Quiz'}
                  </button>
                </div>
              );
            })()}
        </div>
      </div>
    );
  };

  const renderQuizTitleScreen = () => {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6 p-6">
        {/* Main Content Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100 shadow-lg">
          <div className="space-y-4">
            {/* Quiz Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <HelpCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            
            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {quizData?.title || 'Quiz'}
            </h1>
            
            {/* Quiz Info */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="font-medium">{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
              </div>
              {quizData?.time_limit_minutes && (
                <>
                  <div className="hidden sm:block w-1 h-1 bg-gray-400 rounded-full"></div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{quizData.time_limit_minutes} minutes</span>
                  </div>
                </>
              )}
            </div>
            
            <p className="text-gray-600 mt-3">
              Read each question carefully and select the best answer.
            </p>
          </div>
        </div>
        
        {/* Start Button */}
        <Button
          onClick={startQuiz}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
        >
          Start Quiz
        </Button>
      </div>
    );
  };

  const renderQuizQuestion = () => {
    const question = getCurrentQuestion();
    if (!question) return null;

    const userAnswer = getCurrentUserAnswer();
    const hasAnswered = question.question_type === 'fill_blank'
      ? (() => {
          const answers: string[] = Array.isArray(question.correct_answer) ? question.correct_answer : (question.correct_answer ? [question.correct_answer] : []);
          const current = gapAnswers.get(question.id.toString()) || new Array(answers.length).fill('');
          return current.every(v => (v||'').toString().trim() !== '');
        })()
      : question.question_type === 'text_completion'
      ? (() => {
          const current = gapAnswers.get(question.id.toString()) || [];
          return current.length > 0 && current.every(v => (v||'').toString().trim() !== '');
        })()
      : question.question_type === 'long_text' || question.question_type === 'short_answer'
      ? (userAnswer && typeof userAnswer === 'string' && userAnswer.trim().length > 0)
      : userAnswer !== undefined;
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="max-w-3xl mx-auto space-y-6 p-4">
        {/* Progress Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-gray-700">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {Math.round(progress)}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Quiz-level Media for Audio/PDF/Text Quizzes */}
        {quizData?.quiz_media_url && (
          <div className="bg-white rounded-lg shadow-md border p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              {quizData.quiz_media_type === 'audio' ? '🎵 Audio Material' : 
               quizData.quiz_media_type === 'text' ? '� Reading Passage' : 
               '�📄 Reference Material'}
            </h3>
            {quizData.quiz_media_type === 'audio' ? (
              <audio 
                controls 
                src={(import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000') + quizData.quiz_media_url}
                className="w-full"
              />
            ) : quizData.quiz_media_type === 'text' ? (
              <div className="prose prose-lg max-w-none bg-gray-50 p-6 rounded-lg border">
                <div dangerouslySetInnerHTML={{ __html: renderTextWithLatex(quizData.quiz_media_url) }} />
              </div>
            ) : quizData.quiz_media_type === 'pdf' ? (
              // Check if it's actually a PDF or an image
              quizData.quiz_media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <img
                    src={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}${quizData.quiz_media_url}`}
                    alt="Reference material"
                    className="w-full h-auto rounded-lg"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Reference this image to answer the questions below.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <a 
                      href={(import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000') + quizData.quiz_media_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Open PDF →
                    </a>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Reference this document to answer the questions below.
                  </p>
                </div>
              )
            ) : null}
          </div>
        )}

        {/* Question Card */}
        <div className="">
          <div className="p-3">
            {/* Media Attachment for Media Questions */}
            {question.question_type === 'media_question' && question.media_url && (
              <div className="mb-6">
                {question.media_type === 'pdf' ? (
                  <iframe
                    src={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}${question.media_url}#toolbar=0&navpanes=0&scrollbar=1`}
                    className="w-full h-96 border rounded-lg"
                    title="Question PDF"
                  />
                ) : (
                  <img 
                    src={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}${question.media_url}`}
                    alt="Question media" 
                    className="w-full max-h-96 object-contain rounded-lg border"
                  />
                )}
              </div>
            )}

            {/* Content Text for SAT questions (skip for fill-in-the-gaps and text-completion to avoid duplication) */}
            {question.content_text && question.question_type !== 'fill_blank' && question.question_type !== 'text_completion' && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6 border-l-3 border-blue-400">
                <div className="text-gray-700" dangerouslySetInnerHTML={{ __html: renderTextWithLatex(question.content_text) }} />
              </div>
            )}

            {question.question_type !== 'fill_blank' && question.question_type !== 'text_completion' && (
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                <span dangerouslySetInnerHTML={{ __html: renderTextWithLatex(question.question_text.replace(/\[\[.*?\]\]/g, '')) }} />
              </h3>
            )}

            {question.question_type === 'fill_blank' && (
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Fill in the gaps
              </h3>
            )}

            {question.question_type === 'text_completion' && (
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Fill in the blanks
              </h3>
            )}

            {/* Answer Input Based on Question Type */}
            {question.question_type === 'long_text' ? (
              <div className="space-y-4">
                <textarea
                  value={userAnswer || ''}
                  onChange={(e) => handleQuizAnswer(question.id, e.target.value)}
                  placeholder="Enter your detailed answer here..."
                  className="w-full h-32 p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-vertical"
                  maxLength={question.expected_length || 1000}
                />
                {question.expected_length && (
                  <div className="text-sm text-gray-500 text-right">
                    {(userAnswer || '').length} / {question.expected_length} characters
                  </div>
                )}
                {question.keywords && question.keywords.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <strong>Hint:</strong> Try to include these concepts: {question.keywords.join(', ')}
                  </div>
                )}
              </div>
            ) : question.question_type === 'short_answer' ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={userAnswer || ''}
                  onChange={(e) => handleQuizAnswer(question.id, e.target.value)}
                  placeholder="Enter your answer..."
                  className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
            ) : question.question_type === 'text_completion' ? (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-3">Fill in the blanks:</div>
                <div className="leading-relaxed">
                  {(() => {
                    const text = (question.content_text || '').toString();
                    const parts = text.split(/\[\[(.*?)\]\]/g);
                    let gapIndex = 0;
                    const currentAnswers = gapAnswers.get(question.id.toString()) || [];
                    
                    return (
                      <div className="flex flex-wrap items-baseline gap-1">
                        {parts.map((part: string, index: number) => {
                          const isGap = index % 2 === 1;
                          if (!isGap) {
                            return <span key={index} dangerouslySetInnerHTML={{ __html: renderTextWithLatex(part) }} />;
                          }
                          const currentGapIndex = gapIndex++;
                          return (
                            <input
                              key={index}
                              type="text"
                              value={currentAnswers[currentGapIndex] || ''}
                              onChange={(e) => {
                                const newAnswers = [...currentAnswers];
                                newAnswers[currentGapIndex] = e.target.value;
                                setGapAnswers(prev => new Map(prev.set(question.id.toString(), newAnswers)));
                              }}
                              className="inline-block mx-1 px-2 py-1 border-b-2 border-blue-500 bg-transparent text-center min-w-[80px] focus:outline-none focus:border-blue-700"
                              placeholder="____"
                            />
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : question.question_type === 'single_choice' || question.question_type === 'multiple_choice' || question.question_type === 'media_question' ? (
              <div className="space-y-3">
                {question.options?.map((option: any, optionIndex: number) => {
                  const isSelected = userAnswer === optionIndex;
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleQuizAnswer(question.id, optionIndex)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 ${
                        isSelected 
                          ? "bg-blue-50 border-blue-400 shadow-sm" 
                          : "bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {/* Radio Button */}
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                          isSelected 
                            ? "bg-blue-500 border-blue-500" 
                            : "border-gray-300 bg-white"
                        }`}>
                          {isSelected && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                          )}
                        </div>
                        
                        {/* Option Letter */}
                        <span className={`text-sm font-bold ${
                          isSelected ? "text-blue-700" : "text-gray-600"
                        }`}>
                          {option.letter}.
                        </span>
                        
                        {/* Option Text */}
                        <span className={`text-sm flex-1 ${
                          isSelected ? "text-gray-900" : "text-gray-700"
                        }`} dangerouslySetInnerHTML={{ __html: renderTextWithLatex(option.text) }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 border rounded-md">
                {(() => {
                  const answers: string[] = Array.isArray(question.correct_answer) ? question.correct_answer : (question.correct_answer ? [question.correct_answer] : []);
                  const current = gapAnswers.get(question.id.toString()) || new Array(answers.length).fill('');
                  
                  // Convert current array to object for FillInBlankRenderer
                  const answersObj: Record<number, string> = {};
                  current.forEach((val, idx) => {
                    answersObj[idx] = val;
                  });
                  
                  return (
                    <FillInBlankRenderer
                      text={question.content_text || question.question_text || ''}
                      separator={question.gap_separator || ','}
                      answers={answersObj}
                      onAnswerChange={(gapIndex: number, value: string) => {
                        const next = [...current];
                        next[gapIndex] = value;
                        setGapAnswers(prev => new Map(prev.set(question.id.toString(), next)));
                      }}
                      disabled={false}
                      shuffleOptions={true}
                    />
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <Button
            onClick={checkAnswer}
            disabled={!hasAnswered}
            className={`px-8 py-3 rounded-lg text-lg font-semibold transition-all duration-200 ${
              hasAnswered
                ? "btn-primary"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Check Answer
          </Button>
        </div>
      </div>
    );
  };

  const renderQuizResult = () => {
    const question = getCurrentQuestion();
    if (!question) return null;

    const userAnswer = getCurrentUserAnswer();
    const isCorrect = isCurrentAnswerCorrect();
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="max-w-4xl mx-auto space-y-8 p-6">
        {/* Progress Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-700">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {Math.round(progress)}% Complete
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Result Header */}
        <div className={`rounded-xl p-6 text-center shadow-md border ${
          isCorrect 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-center space-x-3">
            {/* Result Icon */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isCorrect 
                ? 'bg-green-500' 
                : 'bg-red-500'
            }`}>
              {isCorrect ? (
                <CheckCircle className="w-6 h-6 text-white" />
              ) : (
                <div className="text-white text-xl font-bold">✗</div>
              )}
            </div>
            
            {/* Result Text */}
            <div>
              <h2 className={`text-xl font-bold ${
                isCorrect ? 'text-green-800' : 'text-red-800'
              }`}>
                {isCorrect ? 'Correct!' : 'Incorrect'}
              </h2>
            </div>
          </div>
        </div>

        {/* Question Review */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-8">
            {question.question_type !== 'fill_blank' && question.question_type !== 'text_completion' && (
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                <span dangerouslySetInnerHTML={{ __html: renderTextWithLatex(question.question_text.replace(/\[\[.*?\]\]/g, '')) }} />
              </h3>
            )}

            {question.question_type === 'fill_blank' && (
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Fill in the gaps
              </h3>
            )}

            {question.question_type === 'text_completion' && (
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Fill in the blanks
              </h3>
            )}
            
            {question.question_type !== 'fill_blank' && question.question_type !== 'text_completion' ? (
              /* Options Review */
              <div className="space-y-4">
                {question.options?.map((option: any, optionIndex: number) => {
                const isSelected = userAnswer === optionIndex;
                const isCorrectOption = optionIndex === question.correct_answer;
                
                return (
                  <div key={option.id} className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                    isCorrectOption 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-md' 
                      : isSelected && !isCorrect
                      ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-300 shadow-md'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center space-x-4">
                      {/* Status Icon */}
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                        isCorrectOption 
                          ? "bg-green-500 border-green-500 shadow-lg" 
                          : isSelected && !isCorrect
                          ? "bg-red-500 border-red-500 shadow-lg"
                          : "border-gray-300 bg-white"
                      }`}>
                        {isCorrectOption ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : isSelected && !isCorrect ? (
                          <div className="text-white text-lg font-bold">✗</div>
                        ) : null}
                      </div>
                      
                      {/* Option Content */}
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <span className={`text-xl font-bold ${
                            isCorrectOption ? 'text-green-700' : 
                            isSelected && !isCorrect ? 'text-red-700' : 'text-gray-600'
                          }`}>
                            {option.letter}.
                          </span>
                          <span className={`text-lg leading-relaxed ${
                            isCorrectOption ? 'text-green-800 font-medium' : 
                            isSelected && !isCorrect ? 'text-red-800' : 'text-gray-700'
                          }`} dangerouslySetInnerHTML={{ __html: renderTextWithLatex(option.text) }} />
                        </div>
                        
                        {/* Status Label */}
                        {(isCorrectOption || (isSelected && !isCorrect)) && (
                          <div className="mt-2">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                              isCorrectOption ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                            }`}>
                              {isCorrectOption ? '✓ Correct Answer' : '✗ Your Answer'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            ) : (
              /* Fill-in-the-gaps Review */
              <div className="p-6 rounded-xl border-2 bg-gray-50 border-gray-200">
                {(() => {
                  const answers: string[] = Array.isArray(question.correct_answer) ? question.correct_answer : (question.correct_answer ? [question.correct_answer] : []);
                  const current = gapAnswers.get(question.id.toString()) || new Array(answers.length).fill('');
                  const parts = (question.content_text || question.question_text || '').split(/\[\[(.*?)\]\]/g);
                  let gapIndex = 0;
                  return (
                    <div className="text-lg leading-relaxed text-gray-800">
                      {parts.map((part: string, i: number) => {
                        const isGap = i % 2 === 1;
                        if (!isGap) {
                          return <span key={i} dangerouslySetInnerHTML={{ __html: renderTextWithLatex(part) }} />;
                        }
                        const idx = gapIndex++;
                        const userAnswer = current[idx] || '';
                        const correctAnswer = answers[idx] || '';
                        const isCorrectGap = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
                        
                        return (
                          <span key={`gap-review-${i}`} className={`inline-flex items-center px-3 py-1 mx-1 rounded-md font-medium ${
                            isCorrectGap 
                              ? 'bg-green-200 text-green-800 border-2 border-green-300' 
                              : 'bg-red-200 text-red-800 border-2 border-red-300'
                          }`}>
                            {userAnswer || `[Gap ${idx+1}]`}
                            {!isCorrectGap && (
                              <span className="ml-2 text-sm">
                                (Correct: <strong>{correctAnswer}</strong>)
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Explanation */}
            {question.explanation && (
              <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-l-4 border-blue-400">
                <h5 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
                  💡 Explanation
                </h5>
                <div className="text-blue-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderTextWithLatex(question.explanation) }} />
              </div>
            )}
          </div>
        </div>

        {/* Continue Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={nextQuestion}
            className="group btn-primary"
          >
            <span className="flex items-center gap-3">
              {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
              <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
            </span>
          </Button>
        </div>
      </div>
    );
  };

  const renderQuizCompleted = () => {
    const score = getScore();
    const percentage = Math.round((score / questions.length) * 100);
    const isPassed = percentage >= 50;
    const stats = getGapStatistics();
    
    // Calculate total "items" (gaps + regular questions)
    const totalItems = stats.totalGaps + stats.regularQuestions;
    const correctItems = stats.correctGaps + stats.correctRegular;
    
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6 p-6">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900">
          Quiz Complete!
        </h1>

        {/* Results Card */}
        <div className={`p-8 rounded-2xl border shadow-lg ${
          isPassed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="space-y-6">
            {/* Score Display */}
            <div className="space-y-2">
              <div className={`text-6xl font-bold ${
                isPassed ? 'text-green-600' : 'text-red-600'
              }`}>
                {percentage}%
              </div>
              <p className={`text-lg font-medium ${
                isPassed ? 'text-green-800' : 'text-red-800'
              }`}>
                {correctItems} out of {totalItems} {totalItems === 1 ? 'answer' : 'answers'} correct
              </p>
              {!isPassed && (
                <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-red-900 font-semibold">
                    You need to score at least 50% to continue
                  </p>
                  <p className="text-red-800 text-sm mt-2">
                    Please try again to improve your score
                  </p>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className={`rounded-lg p-3 border ${
                isPassed ? 'bg-white/50 border-green-200' : 'bg-white/50 border-red-200'
              }`}>
                <div className={`text-2xl font-bold ${
                  isPassed ? 'text-green-600' : 'text-red-600'
                }`}>{correctItems}</div>
                <div className={`text-sm font-medium ${
                  isPassed ? 'text-green-800' : 'text-red-800'
                }`}>Correct</div>
              </div>
              <div className={`rounded-lg p-3 border ${
                isPassed ? 'bg-white/50 border-green-200' : 'bg-white/50 border-red-200'
              }`}>
                <div className={`text-2xl font-bold ${
                  isPassed ? 'text-green-600' : 'text-red-600'
                }`}>{totalItems - correctItems}</div>
                <div className={`text-sm font-medium ${
                  isPassed ? 'text-green-800' : 'text-red-800'
                }`}>Incorrect</div>
              </div>
              <div className={`rounded-lg p-3 border ${
                isPassed ? 'bg-white/50 border-green-200' : 'bg-white/50 border-red-200'
              }`}>
                <div className={`text-2xl font-bold ${
                  isPassed ? 'text-green-600' : 'text-red-600'
                }`}>{totalItems}</div>
                <div className={`text-sm font-medium ${
                  isPassed ? 'text-green-800' : 'text-red-800'
                }`}>Total</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={resetQuiz}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400 px-6 py-3 rounded-lg text-base font-semibold shadow-sm hover:shadow-md transition-all duration-200"
          >
            Retake Quiz
          </button>
          
          {isPassed && (
            <button
              onClick={() => {
                // Mark quiz as completed and step as completed before going to next step
                if (currentStep) {
                  setQuizCompleted(prev => new Map(prev.set(currentStep.id.toString(), true)));
                  markStepAsVisited(currentStep.id.toString(), 5); // 5 minutes for quiz completion
                }
                // Go directly to next step without checking canProceedToNext()
                if (currentStepIndex < steps.length - 1) {
                  goToStep(currentStepIndex + 1);
                } else if (nextLessonId) {
                  navigate(`/course/${courseId}/lesson/${nextLessonId}`);
                }
              }}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 rounded-lg text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    );
  };


  const renderAttachments = (attachmentsJson?: string) => {
    if (!attachmentsJson) return null;

    try {
      const attachments: StepAttachment[] = JSON.parse(attachmentsJson);
      if (!attachments || attachments.length === 0) return null;

      return (
        <div className="mt-6 p-4 rounded-lg border">
          <div className="space-y-4">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="rounded">
                {/* PDF Preview */}
                {attachment.file_type.toLowerCase() === 'pdf' && (
                      <iframe
                        src={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}${attachment.file_url}#toolbar=0&navpanes=0&scrollbar=1`}
                        className="w-full h-96 sm:h-[500px] lg:h-[600px] border-0"
                        title={`Preview of ${attachment.filename}`}
                      />
                )}
                
                {/* Image Preview */}
                {['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(attachment.file_type.toLowerCase()) && (
                  <div className="mt-3">
                    <img
                      src={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}${attachment.file_url}`}
                      alt={attachment.filename}
                      className="w-full h-auto rounded"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    } catch (e) {
      console.error('Failed to parse attachments:', e);
      return null;
    }
  };

  const renderStepContent = () => {
    if (!currentStep) return null;

    switch (currentStep.content_type) {
      case 'text':
        return (
          <div>
            {renderAttachments(currentStep.attachments)}
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: renderTextWithLatex(currentStep.content_text || '') }} />
            </div>
          </div>
        );
      
      case 'video_text':
        return (
          <div className="space-y-4">
            {currentStep.video_url && (
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <YouTubeVideoPlayer
                  url={currentStep.video_url}
                  title={currentStep.title || 'Lesson Video'}
                  className="w-full h-full"
                  onProgress={(progress) => {
                    setVideoProgress(prev => new Map(prev.set(currentStep.id.toString(), progress)));
                    
                    // Auto-complete video step when 90%+ is watched
                    if (progress >= 0.9) {
                      const stepProgress = stepsProgress.find(p => p.step_id === currentStep.id);
                      if (!stepProgress || stepProgress.status !== 'completed') {
                        // Calculate time spent based on video duration and progress
                        const timeSpent = Math.ceil(progress * 10); // Estimate time spent in minutes
                        markStepAsVisited(currentStep.id.toString(), timeSpent);
                      }
                    }
                  }}
                />
              </div>
            )}
            
            {/* Video Progress Indicator */}
            {currentStep && currentStep.video_url && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">Video Watch Progress</span>
                  <span className="text-sm text-blue-600">
                    {Math.round((videoProgress.get(currentStep.id.toString()) || 0) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(videoProgress.get(currentStep.id.toString()) || 0) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  You need to watch 90% or more of the video to proceed to the next step
                </p>
              </div>
            )}
          
            {renderAttachments(currentStep.attachments)}
            
            {currentStep.content_text && (
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: renderTextWithLatex(currentStep.content_text) }} />
              </div>
            )}
          </div>
        );
      
      case 'quiz':
        {
          // Check display mode from quiz data
          const displayMode = quizData?.display_mode || 'one_by_one';
          if (displayMode === 'all_at_once') {
            return renderQuizFeed();
          }
        }
        const quizContent = (() => {
          switch (quizState) {
            case 'title':
              return renderQuizTitleScreen();
            case 'question':
              return renderQuizQuestion();
            case 'result':
              return renderQuizResult();
            case 'completed':
              return renderQuizCompleted();
            default:
              return <div>Loading quiz...</div>;
          }
        })();

        return (
          <div>
            {quizContent}
            
           
          </div>
        );
      
      case 'flashcard':
        try {
          const flashcardData = JSON.parse(currentStep.content_text || '{}');
          return (
            <div>
              <FlashcardViewer
                flashcardSet={flashcardData}
                stepId={currentStep.id}
                lessonId={parseInt(lessonId || '0')}
                courseId={parseInt(courseId || '0')}
                onComplete={() => {
                  // Mark flashcard step as completed
                  if (currentStep) {
                    markStepAsVisited(currentStep.id.toString(), 5); // 5 minutes for flashcard completion
                  }
                }}
                onProgress={(completed, total) => {
                  // Optional: track flashcard progress
                  console.log(`Flashcard progress: ${completed}/${total}`);
                }}
              />
            </div>
          );
        } catch (error) {
          console.error('Failed to parse flashcard data:', error);
          return <div>Error loading flashcards</div>;
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
      {/* Sidebar (desktop) */}
      <div className="hidden lg:block">
        <LessonSidebar
          course={course}
          modules={modules}
          selectedLessonId={lessonId!}
          onLessonSelect={handleLessonSelect}
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Card className="border-0 rounded-none border-b">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Mobile: open lessons sidebar */}
                <button 
                  className="lg:hidden inline-flex items-center px-3 py-2 border rounded-md text-sm"
                  onClick={() => setIsMobileSidebarOpen(true)}
                >
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Lessons
                </button>
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
              <div className="hidden" />
            </div>
          </CardHeader>
        </Card>
        
        {/* Content */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Steps Navigation */}
            <div className="mb-6">
              <div className="grid gap-2 [grid-template-columns:repeat(6,minmax(0,1fr))] sm:[grid-template-columns:repeat(10,minmax(0,1fr))] lg:[grid-template-columns:repeat(15,minmax(0,1fr))]">
                {steps
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((step, index) => {
                    const isCompleted = isStepCompleted(step);
                    
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
                          <div className="absolute top-1 left-1 text-[10px] sm:text-[11px] bg-white/20 rounded px-1 py-0.5">
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

            {/* Content Actions */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  {currentStep?.content_type === 'video_text' ? 'Video' : currentStep?.content_type === 'quiz' ? 'Quiz' : 'Reading'}
                </Badge>
                {lesson.title && (
                  <Badge variant="outline">{lesson.title}</Badge>
                )}
              </div>
            </div>

            {/* Step Content */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                {currentStep ? (
                  <div className="min-h-[300px] sm:min-h-[400px]">
                    {renderStepContent()}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No steps available for this lesson.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bottom step navigation */}
            <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:justify-between items-center">
              <Button
                variant="outline"
                onClick={goToPreviousStep}
                disabled={currentStepIndex === 0}
                className="w-full sm:w-auto"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground order-[-1] sm:order-none">
                <span>Step {currentStep?.order_index ?? currentStepIndex + 1} of {steps.length}</span>
                <span className="hidden sm:inline">•</span>
                <span>Lesson {lesson.module_id}.{lesson.order_index}</span>
                {currentStep && !isStepCompleted(currentStep) && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="text-orange-600 font-medium">
                      {currentStep.content_type === 'video_text' ? 'Video not watched enough' : 
                       currentStep.content_type === 'quiz' ? 'Quiz is not complete' : 
                       'Step is not completed'}
                    </span>
                  </>
                )}
              </div>
              <Button
                onClick={goToNextStep}
                className="w-full sm:w-auto"
                disabled={!canProceedToNext()}
              >
                {currentStepIndex < steps.length - 1 ? 'Next' : (nextLessonId ? 'Next Lesson' : 'Next')}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setIsMobileSidebarOpen(false)} />
          <div className="absolute top-0 left-0 w-72 max-w-[85%] h-full bg-background border-r shadow-xl">
            <LessonSidebar
              course={course}
              modules={modules}
              selectedLessonId={lessonId!}
              onLessonSelect={(id) => { handleLessonSelect(id); setIsMobileSidebarOpen(false); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
