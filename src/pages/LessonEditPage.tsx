import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import type { Course, CourseModule, Lesson, LessonContentType, Assignment, Question, Step } from '../types';
import { 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  HelpCircle, 
  Settings, 
  Save, 
  ArrowLeft, 
  Video, 
  FileText, 
  HelpCircle as QuizIcon,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  BookOpen,
  Play,
  Edit3
} from 'lucide-react';
import YouTubeVideoPlayer from '../components/YouTubeVideoPlayer';
import { isValidYouTubeUrl } from '../utils/youtube';
import RichTextEditor from '../components/RichTextEditor';
import VideoLessonEditor from '../components/lesson/VideoLessonEditor';
import TextLessonEditor from '../components/lesson/TextLessonEditor';
import QuizLessonEditor from '../components/lesson/QuizLessonEditor';
import Loader from '../components/Loader.tsx';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

interface LessonSidebarProps {
  course: Course | null;
  modules: CourseModule[];
  selectedLessonId: string;
  onLessonSelect: (lessonId: string) => void;
}

// Quiz Tab Content Component
interface QuizTabContentProps {
  quizTitle: string;
  setQuizTitle: (title: string) => void;
  quizQuestions: Question[];
  setQuizQuestions: (questions: Question[]) => void;
  quizTimeLimit: number | undefined;
  setQuizTimeLimit: (limit: number | undefined) => void;
}

const QuizTabContent = ({
  quizTitle,
  setQuizTitle,
  quizQuestions,
  setQuizQuestions,
  quizTimeLimit,
  setQuizTimeLimit
}: QuizTabContentProps) => {
  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      assignment_id: '',
      question_text: '',
      question_type: 'single_choice',
      options: [
        { id: Date.now().toString() + '_1', text: '', is_correct: false },
        { id: Date.now().toString() + '_2', text: '', is_correct: false }
      ],
      correct_answer: '',
      points: 10,
      order_index: quizQuestions.length
    };
    setQuizQuestions([...quizQuestions, newQuestion]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updatedQuestions = [...quizQuestions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuizQuestions(updatedQuestions);
  };

  const removeQuestion = (index: number) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
  };

  const addOption = (questionIndex: number) => {
    const updatedQuestions = [...quizQuestions];
    const question = updatedQuestions[questionIndex];
    if (question.options) {
      question.options.push({
        id: Date.now().toString(),
        text: '',
        is_correct: false
      });
      setQuizQuestions(updatedQuestions);
    }
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...quizQuestions];
    const question = updatedQuestions[questionIndex];
    if (question.options && question.options.length > 2) {
      question.options.splice(optionIndex, 1);
      setQuizQuestions(updatedQuestions);
    }
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...quizQuestions];
    const question = updatedQuestions[questionIndex];
    if (question.options) {
      question.options[optionIndex] = {
        ...question.options[optionIndex],
        text: value
      };
      setQuizQuestions(updatedQuestions);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quiz Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QuizIcon className="w-5 h-5" />
            Quiz Settings
          </CardTitle>
          <CardDescription>
            Configure the basic settings for your quiz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiz-title">Quiz Title</Label>
              <Input
                id="quiz-title"
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="Enter quiz title"
              />
            </div>
            <div className="space-y-2">
              <Label>Max Score</Label>
              <div className="flex items-center px-3 py-2 border border-input rounded-md bg-muted">
                <span className="text-sm font-medium">{quizQuestions.length} points</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time-limit">Time Limit (minutes) - Optional</Label>
            <Input
              id="time-limit"
              type="number"
              value={quizTimeLimit || ''}
              onChange={(e) => setQuizTimeLimit(e.target.value ? parseInt(e.target.value) : undefined)}
              min="1"
              placeholder="Leave empty for no time limit"
            />
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Questions
              </CardTitle>
              <CardDescription>
                Add and configure quiz questions
              </CardDescription>
            </div>
            <Button onClick={addQuestion} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quizQuestions.map((question, questionIndex) => (
              <Card key={question.id} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                        {questionIndex + 1}
                      </span>
                      <h4 className="font-medium">Question {questionIndex + 1}</h4>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeQuestion(questionIndex)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`question-${questionIndex}`}>Question Text</Label>
                    <Input
                      id={`question-${questionIndex}`}
                      type="text"
                      value={question.question_text}
                      onChange={(e) => updateQuestion(questionIndex, 'question_text', e.target.value)}
                      placeholder="Enter your question"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`type-${questionIndex}`}>Question Type</Label>
                      <Select
                        value={question.question_type}
                        onValueChange={(value) => updateQuestion(questionIndex, 'question_type', value)}
                      >
                        <SelectTrigger id={`type-${questionIndex}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single_choice">Single Choice</SelectItem>
                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                          <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`points-${questionIndex}`}>Points</Label>
                      <Input
                        id={`points-${questionIndex}`}
                        type="number"
                        value={question.points}
                        onChange={(e) => updateQuestion(questionIndex, 'points', parseInt(e.target.value) || 0)}
                        min="1"
                      />
                    </div>
                  </div>

                  {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Options</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addOption(questionIndex)}
                          className="flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add Option
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {question.options?.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center gap-3 p-3 border rounded-lg">
                            <input
                              type={question.question_type === 'single_choice' ? 'radio' : 'checkbox'}
                              name={`correct-${questionIndex}`}
                              checked={
                                question.question_type === 'single_choice'
                                  ? question.correct_answer === optionIndex.toString()
                                  : Array.isArray(question.correct_answer) && question.correct_answer.includes(optionIndex.toString())
                              }
                              onChange={(e) => {
                                if (question.question_type === 'single_choice') {
                                  updateQuestion(questionIndex, 'correct_answer', optionIndex.toString());
                                } else {
                                  const currentAnswers = Array.isArray(question.correct_answer) ? question.correct_answer : [];
                                  const newAnswers = e.target.checked
                                    ? [...currentAnswers, optionIndex.toString()]
                                    : currentAnswers.filter(a => a !== optionIndex.toString());
                                  updateQuestion(questionIndex, 'correct_answer', newAnswers);
                                }
                              }}
                              className="text-primary focus:ring-primary"
                            />
                            <Input
                              type="text"
                              value={option.text}
                              onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                              className="flex-1"
                              placeholder={`Option ${optionIndex + 1}`}
                            />
                            {question.options && question.options.length > 2 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeOption(questionIndex, optionIndex)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {question.question_type === 'fill_blank' && (
                    <div className="space-y-2">
                      <Label htmlFor={`answer-${questionIndex}`}>Correct Answer</Label>
                      <Input
                        id={`answer-${questionIndex}`}
                        type="text"
                        value={question.correct_answer || ''}
                        onChange={(e) => updateQuestion(questionIndex, 'correct_answer', e.target.value)}
                        placeholder="Enter the correct answer"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {quizQuestions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No questions added yet</p>
              <p className="text-sm">Click "Add Question" to get started with your quiz</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};



const LessonSidebar = ({ course, modules, selectedLessonId, onLessonSelect }: LessonSidebarProps) => {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [moduleLectures, setModuleLectures] = useState<Map<string, Lesson[]>>(new Map());

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
                                case 'quiz': return <QuizIcon className="w-4 h-4" />;
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
                                        Currently editing
                                      </span>
                                    )}
                                    {lecture.steps && lecture.steps.length > 0 && (
                                      <span className="text-xs text-green-600 flex items-center gap-1">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        Has content
                                      </span>
                                    )}
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



export default function LessonEditPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isValidVideoUrl, setIsValidVideoUrl] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasCheckedDraft, setHasCheckedDraft] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isFixingOrder, setIsFixingOrder] = useState(false);

  // New tab state
  const [selectedTab, setSelectedTab] = useState<'video' | 'text' | 'quiz'>('video');
  const [contentType, setContentType] = useState<LessonContentType>('video');
  
  // Quiz state
  const [quizTitle, setQuizTitle] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [quizTimeLimit, setQuizTimeLimit] = useState<number | undefined>(undefined);
  const [currentAssignment, setCurrentAssignment] = useState<Assignment | null>(null);

  // Steps management state
  const [steps, setSteps] = useState<Step[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<number | null>(null);
  const [stepTitle, setStepTitle] = useState('');
  const [stepContentType, setStepContentType] = useState<'text' | 'video_text' | 'quiz'>('text');
  const [stepContent, setStepContent] = useState('');
  const [stepVideoUrl, setStepVideoUrl] = useState('');
  const [stepQuizTitle, setStepQuizTitle] = useState('');
  const [stepQuizQuestions, setStepQuizQuestions] = useState<Question[]>([]);
  const [stepQuizTimeLimit, setStepQuizTimeLimit] = useState<number | undefined>(undefined);
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [newStepType, setNewStepType] = useState<'text' | 'video_text' | 'quiz'>('text');

  // Immediate auto-save function
  const immediateAutoSave = useCallback(
    (lessonId: string, title: string, contentData: any, contentType: string) => {
      setAutoSaveStatus('saving');
      saveToLocalStorage(lessonId, { title, contentData, contentType });
    },
    []
  );

  useEffect(() => {
    if (!courseId || !lessonId) return;
    loadData();
  }, [courseId, lessonId]);

  // Load draft from localStorage on component mount (silent)
  useEffect(() => {
    if (lessonId && !isLoading && !hasCheckedDraft) {
      const savedData = loadFromLocalStorage(lessonId);
      if (savedData) {
        // Silently restore draft data
        setLessonTitle(savedData.title);
        setContentType(savedData.contentType);
        setSelectedTab(savedData.contentType === 'quiz' ? 'quiz' : savedData.contentType === 'text' ? 'text' : 'video');
        
        if (savedData.contentType === 'video') {
          if (savedData.contentData?.videoUrl) {
            setVideoUrl(savedData.contentData.videoUrl);
          }
          if (savedData.contentData?.lessonContent) {
            setLessonContent(savedData.contentData.lessonContent);
          }
        } else if (savedData.contentType === 'text' && savedData.contentData?.lessonContent) {
          setLessonContent(savedData.contentData.lessonContent);
                    } else if (savedData.contentType === 'quiz' && savedData.contentData) {
              setQuizTitle(savedData.contentData.quizTitle || '');
              setQuizQuestions(savedData.contentData.quizQuestions || []);
              setQuizTimeLimit(savedData.contentData.quizTimeLimit);
            }
        
        setHasUnsavedChanges(true);
      }
      setHasCheckedDraft(true);
    }
  }, [lessonId, isLoading, hasCheckedDraft]);

  // Auto-save on changes
  useEffect(() => {
    if (lessonId && !isLoading) {
      let hasContent = false;
      let contentData = {};
      
      if (contentType === 'video' && (videoUrl || lessonContent)) {
        hasContent = true;
        contentData = { videoUrl, lessonContent };
      } else if (contentType === 'text' && lessonContent) {
        hasContent = true;
        contentData = { lessonContent };
      } else if (contentType === 'quiz' && (quizTitle || quizQuestions.length > 0)) {
        hasContent = true;
        contentData = { quizTitle, quizQuestions, quizTimeLimit };
      }
      
      if (lessonTitle || hasContent) {
        immediateAutoSave(lessonId, lessonTitle, contentData, contentType);
      }
    }
  }, [lessonId, lessonTitle, lessonContent, videoUrl, quizTitle, quizQuestions, quizTimeLimit, contentType, isLoading, immediateAutoSave]);

  // Note: Removed beforeunload warning to avoid unwanted dialogs

  const loadData = async () => {
    if (!courseId || !lessonId) return;
    
    setIsLoading(true);
    try {
      // Debug: Check authentication
      const isAuth = apiClient.isAuthenticated();
      
      if (!isAuth) {
        console.error('User is not authenticated');
        throw new Error('Authentication required');
      }
      
      // Load course and modules
      const courseData = await apiClient.getCourse(courseId);
      setCourse(courseData);
      console.log('Loaded course:', courseData);
      
      const modulesData = await apiClient.getCourseModules(courseId);
      setModules(modulesData);
      console.log('Loaded modules:', modulesData);
      
      // Load lesson with steps
      const lessonData = await apiClient.getLesson(lessonId);
      
      setLesson(lessonData);
      setLessonTitle(lessonData.title);
      
      // Load steps for this lesson
      const stepsData = await apiClient.getLessonSteps(lessonId);
      setSteps(stepsData);
      
      // Set content type and tab based on first step
      if (stepsData.length > 0) {
        const firstStep = stepsData[0];
        setContentType(firstStep.content_type as LessonContentType);
      
      // Map content type to tab and set data based on type
        if (firstStep.content_type === 'quiz') {
        setSelectedTab('quiz');
          try {
            const quizData = JSON.parse(firstStep.content_text || '{}');
            setQuizTitle(quizData.title || lessonData.title);
            setQuizQuestions(quizData.questions || []);
            setQuizTimeLimit(quizData.time_limit_minutes);
          } catch (e) {
            console.error('Failed to parse quiz data:', e);
          }
        } else if (firstStep.content_type === 'text') {
        setSelectedTab('text');
          setLessonContent(firstStep.content_text || '');
        } else if (firstStep.content_type === 'video_text') {
        setSelectedTab('video');
          setVideoUrl(firstStep.video_url || '');
          setLessonContent(firstStep.content_text || '');
        }
        
        // Select first step by default
        setSelectedStepId(firstStep.id);
        setStepTitle(firstStep.title || 'Step 1');
        setStepContentType(firstStep.content_type);
        setStepContent(firstStep.content_text || '');
        setStepVideoUrl(firstStep.video_url || '');
        
        if (firstStep.content_type === 'quiz') {
          try {
            const quizData = JSON.parse(firstStep.content_text || '{}');
            setStepQuizTitle(quizData.title || '');
            setStepQuizQuestions(quizData.questions || []);
            setStepQuizTimeLimit(quizData.time_limit_minutes);
          } catch (e) {
            console.error('Failed to parse quiz data:', e);
          }
        }
      } else {
        // No steps yet, create a default step (local only)
        const localDefaultStep: Step = {
          id: -Date.now(),
          lesson_id: parseInt(lessonId),
          title: 'Step 1',
          content_type: 'text' as const,
          content_text: '',
          video_url: '',
          order_index: 1,
          created_at: new Date().toISOString(),
        } as unknown as Step;
        setSteps([localDefaultStep]);
        setSelectedStepId(localDefaultStep.id);
        setStepTitle(localDefaultStep.title);
        setStepContentType(localDefaultStep.content_type);
        setStepContent(localDefaultStep.content_text || '');
         
        // Default to text
        setSelectedTab('text');
        setContentType('text' as LessonContentType);
      }
      
    } catch (error) {
      console.error('Failed to load lesson data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Steps management functions
  const addNewStep = () => {
    setShowAddStepModal(true);
  };

  const createStep = async () => {
    const maxOrderIndex = steps.length > 0 ? Math.max(...steps.map(s => s.order_index)) : 0;
    const stepNumber = maxOrderIndex + 1;

    const newLocalStep: Step = {
      id: -Date.now(),
      lesson_id: parseInt(lessonId || '0'),
      title: `Step ${stepNumber}`,
      content_type: newStepType,
      content_text: '',
      order_index: stepNumber,
      created_at: new Date().toISOString(),
    } as unknown as Step;

    const updated = [...steps, newLocalStep].sort((a, b) => a.order_index - b.order_index);
    setSteps(updated);
    setSelectedStepId(newLocalStep.id);
    setStepTitle(newLocalStep.title);
    setStepContentType(newLocalStep.content_type);
    setStepContent('');
    setStepVideoUrl('');
    setStepQuizTitle('');
    setStepQuizQuestions([]);
    setStepQuizTimeLimit(undefined);
    setShowAddStepModal(false);
    setNewStepType('text');
  };

  const selectStep = (step: Step) => {
    setSelectedStepId(step.id);
    setStepTitle(step.title || `Step ${step.order_index || 1}`);
    setStepContentType(step.content_type);
    setStepContent(step.content_text || '');
    setStepVideoUrl(step.video_url || '');

    if (step.content_type === 'quiz') {
      try {
        const quizData = JSON.parse(step.content_text || '{}');
        setStepQuizTitle(quizData.title || '');
        setStepQuizQuestions(quizData.questions || []);
        setStepQuizTimeLimit(quizData.time_limit_minutes);
      } catch (e) {
        console.error('Failed to parse quiz data:', e);
      }
    } else {
      setStepQuizTitle('');
      setStepQuizQuestions([]);
      setStepQuizTimeLimit(undefined);
    }
  };

  const deleteStep = async (stepId: number) => {
    const remaining = steps
      .filter(s => s.id !== stepId)
      .sort((a, b) => a.order_index - b.order_index)
      .map((s, idx) => ({ ...s, order_index: idx + 1, title: (s.title || '').replace(/^Step \d+/, `Step ${idx + 1}`) }));
    setSteps(remaining);

    if (selectedStepId === stepId) {
      if (remaining.length > 0) {
        selectStep(remaining[0]);
      } else {
        setSelectedStepId(null);
      }
    }
  };

  const saveCurrentStep = async () => {
    if (!selectedStepId) return;

    const updatedSteps = steps.map(s => {
      if (s.id !== selectedStepId) return s;
      const updated: Partial<Step> = {
        title: stepTitle,
        content_type: stepContentType,
      };
      if (stepContentType === 'text') {
        updated.content_text = stepContent;
        updated.video_url = '';
      } else if (stepContentType === 'video_text') {
        updated.video_url = stepVideoUrl;
        updated.content_text = stepContent;
      } else if (stepContentType === 'quiz') {
        updated.content_text = JSON.stringify({
          title: stepQuizTitle,
          questions: stepQuizQuestions,
          time_limit_minutes: stepQuizTimeLimit
        });
        updated.video_url = '';
      }
      return { ...s, ...updated } as Step;
    });

    setSteps(updatedSteps);
  };

  const getStepIcon = (contentType: string) => {
    switch (contentType) {
      case 'video_text': return <Video className="w-4 h-4" />;
      case 'quiz': return <QuizIcon className="w-4 h-4" />;
      case 'text': return <FileText className="w-4 h-4" />;
      default: return <Edit3 className="w-4 h-4" />;
    }
  };

  const handleSave = async () => {
    if (!lessonId) return;
    
    setIsSaving(true);
    try {
      // 1) Merge current editor state into steps so unsaved edits are included
      let mergedSteps = steps;
      if (selectedStepId) {
        mergedSteps = steps.map(s => {
          if (s.id !== selectedStepId) return s;
          const updated: Partial<Step> = {
            title: stepTitle,
            content_type: stepContentType,
          };
          if (stepContentType === 'text') {
            updated.content_text = stepContent;
            updated.video_url = '';
          } else if (stepContentType === 'video_text') {
            updated.video_url = stepVideoUrl;
            updated.content_text = stepContent;
          } else if (stepContentType === 'quiz') {
            updated.content_text = JSON.stringify({
              title: stepQuizTitle,
              questions: stepQuizQuestions,
              time_limit_minutes: stepQuizTimeLimit
            });
            updated.video_url = '';
          }
          return { ...s, ...updated } as Step;
        });
        setSteps(mergedSteps);
      }

      const lessonUpdateData = {
        title: lessonTitle,
        order_index: lesson?.order_index || 0
      };
      
      const updatedLesson = await apiClient.updateLesson(lessonId, lessonUpdateData);
      setLesson(updatedLesson);
      
      // Sync steps: delete all existing on server, then recreate from local state
      const existingSteps = await apiClient.getLessonSteps(lessonId);

      for (const s of existingSteps) {
        await apiClient.deleteStep(s.id);
      }

      // Recreate current local steps with proper order_index
      const orderedLocal = [...mergedSteps].sort((a, b) => a.order_index - b.order_index);
      for (const s of orderedLocal) {
        const payload: Partial<Step> = {
          title: s.title,
          content_type: s.content_type,
          order_index: s.order_index,
          content_text: s.content_text || '',
          video_url: s.video_url || ''
        };
        await apiClient.createStep(lessonId, payload);
      }

      // Reload fresh steps from server and sync selection by order_index
      const freshSteps = await apiClient.getLessonSteps(lessonId);
      setSteps(freshSteps);
      if (selectedStepId) {
        const prevOrder = orderedLocal.find(s => s.id === selectedStepId)?.order_index || 1;
        const match = freshSteps.find(s => s.order_index === prevOrder) || freshSteps[0];
        if (match) {
          setSelectedStepId(match.id);
          setStepTitle(match.title);
          setStepContentType(match.content_type as any);
          setStepContent(match.content_text || '');
          setStepVideoUrl(match.video_url || '');
        }
      }

      // Refresh sidebar modules
      if (course?.id) {
        const updatedModules = await apiClient.getCourseModules(course.id);
        setModules(updatedModules);
      }
      
      clearLocalStorage(lessonId);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save lesson:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLessonSelect = (newLessonId: string) => {
    if (newLessonId !== lessonId) {
      navigate(`/teacher/course/${courseId}/lesson/${newLessonId}/edit`);
    }
  };

  const handleVideoUrlChange = (url: string) => {
    setVideoUrl(url);
    setVideoError(null);
    
    // Immediate save on video URL change
    if (lessonId && !isLoading && contentType === 'video') {
      const contentData = { videoUrl: url, lessonContent };
      immediateAutoSave(lessonId, lessonTitle, contentData, contentType);
    }
    
    if (url.trim() === '') {
      return;
    }
    
    const isValid = isValidYouTubeUrl(url);
    
    if (!isValid && url.trim() !== '') {
      setVideoError('Please enter a valid YouTube URL');
    }
  };

  const handleVideoError = (error: string) => {
    setVideoError(error);
  };

  // LocalStorage functions
  const getLocalStorageKey = (lessonId: string) => `lesson_draft_${lessonId}`;
  const getTimestampKey = (lessonId: string) => `lesson_draft_timestamp_${lessonId}`;

  const saveToLocalStorage = (lessonId: string, data: {
    title: string;
    contentData: any;
    contentType: string;
  }) => {
    try {
      const key = getLocalStorageKey(lessonId);
      const timestampKey = getTimestampKey(lessonId);
      const timestamp = Date.now();
      
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(timestampKey, timestamp.toString());
      
      setAutoSaveStatus('saved');
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      setAutoSaveStatus('unsaved');
    }
  };

  const loadFromLocalStorage = (lessonId: string) => {
    try {
      const key = getLocalStorageKey(lessonId);
      const timestampKey = getTimestampKey(lessonId);
      
      const savedData = localStorage.getItem(key);
      const savedTimestamp = localStorage.getItem(timestampKey);
      
      if (savedData && savedTimestamp) {
        const data = JSON.parse(savedData);
        const timestamp = parseInt(savedTimestamp);
        const hoursSinceLastSave = (Date.now() - timestamp) / (1000 * 60 * 60);
        
        // Only restore if saved within last 24 hours
        if (hoursSinceLastSave < 24) {
          return data;
        } else {
          // Clear old drafts
          clearLocalStorage(lessonId);
        }
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
    return null;
  };

  const clearLocalStorage = (lessonId: string) => {
    try {
      const key = getLocalStorageKey(lessonId);
      const timestampKey = getTimestampKey(lessonId);
      
      localStorage.removeItem(key);
      localStorage.removeItem(timestampKey);
      
      setAutoSaveStatus('saved');
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader size="xl" animation="spin" color="#2563eb" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">Lesson not found</div>
      </div>
    );
  }

  const remainingChars = 100 - lessonTitle.length;

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
                <Settings className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Lesson Settings</CardTitle>
                  <CardDescription>
                    Configure your lesson content and settings
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {showSaveSuccess && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-md border border-green-200">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Lesson saved</span>
                  </div>
                )}
                {autoSaveStatus === 'saving' && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium">Saving...</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
        
        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Lesson Title */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5" />
                  Lesson Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="lesson-title">Title</Label>
                    <span className="text-sm text-muted-foreground">
                      {remainingChars} characters remaining
                    </span>
                  </div>
                  <Input
                    id="lesson-title"
                    type="text"
                    value={lessonTitle}
                    onChange={(e) => {
                      setLessonTitle(e.target.value);
                      // Immediate save on each character
                      if (lessonId && !isLoading) {
                        const contentData = contentType === 'video' ? { videoUrl } : 
                                          contentType === 'text' ? { lessonContent } : 
                                          contentType === 'quiz' ? { quizTitle, quizQuestions, quizTimeLimit } : {};
                        immediateAutoSave(lessonId, e.target.value, contentData, contentType);
                      }
                    }}
                    maxLength={100}
                    placeholder="Enter lesson title"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Steps (blue tiles) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium text-foreground">Lesson Content</h3>
              </div>
              <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(15, 1fr)' }}>
                {/* Add tile */}
                {steps
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((step, index) => (
                    <div 
                      key={step.id}
                      onClick={() => selectStep(step)}
                      className={`aspect-square rounded-md text-white p-1 relative shadow-sm hover:shadow-md transition-all cursor-pointer ${
                        selectedStepId === step.id 
                          ? 'bg-blue-800 ring-2 ring-blue-400' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                                              <div className="h-full w-full flex flex-col items-start justify-end">
                          <div className="absolute top-1 left-1 text-[9px] bg-white/20 rounded px-1 py-0.5">
                            {step.order_index}
                          </div>
                          <div className="flex items-center gap-1 opacity-90">
                            {getStepIcon(step.content_type)}
                          </div>
                        </div>
                    </div>
                  ))}
                  <button
                  onClick={addNewStep}
                  className="aspect-square rounded-md border-2 border-dashed border-blue-300 hover:border-blue-500 flex items-center justify-center text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <Plus className="w-6 h-6" />
                  </div>
                </button>
              </div>
            </div>
                         <div className="flex-1 overflow-y-auto mt-4">
               {selectedStepId && (
                 <div className="space-y-2">
                   <div className="flex items-center gap-2 pb-2 font-medium text-foreground text-lg">
                     <h3>
                       Step {steps.find(s => s.id === selectedStepId)?.order_index}: {stepContentType === 'video_text' ? 'Video + Text' : stepContentType.charAt(0).toUpperCase() + stepContentType.slice(1)}
                     </h3>
                     <Button 
                       variant="outline" 
                       size="icon"
                       onClick={() => deleteStep(selectedStepId)}
                       className="text-red-600 hover:text-red-700 hover:bg-red-50"
                     >
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </div>
                   <div>
                    {stepContentType === 'text' && (
                      <div className="space-y-3">
                        <TextLessonEditor
                          content={stepContent}
                          onContentChange={setStepContent}
                        />
                      </div>
                    )}

                    {stepContentType === 'video_text' && (
                      <div className="space-y-3">
                    <VideoLessonEditor
                          lessonTitle={stepTitle || lessonTitle}
                          videoUrl={stepVideoUrl}
                          onVideoUrlChange={setStepVideoUrl}
                          onClearUrl={() => setStepVideoUrl('')}
                          content={stepContent}
                          onContentChange={setStepContent}
                        />
                      </div>
                    )}

                    {stepContentType === 'quiz' && (
                      <div className="space-y-3">
                    <QuizLessonEditor
                          quizTitle={stepQuizTitle}
                          setQuizTitle={setStepQuizTitle}
                          quizQuestions={stepQuizQuestions}
                          setQuizQuestions={setStepQuizQuestions}
                          quizTimeLimit={stepQuizTimeLimit}
                          setQuizTimeLimit={setStepQuizTimeLimit}
                        />
                      </div>
                    )}

                   
                   </div>
                 </div>
               )}
               </div>
          </div>
        </div>

      
        
        {/* Bottom Bar */}
        <Card className="border-0 rounded-none border-t">
          <CardContent className="p-4">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/teacher/course/${courseId}`)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Return to Course
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Lesson'}
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>Unsaved changes</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Step Modal */}
      {showAddStepModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Add New Step</h2>
              <p className="text-muted-foreground">Choose the content type for your new step</p>
            </div>
            
            <div className="space-y-4 mb-6">
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  newStepType === 'text' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setNewStepType('text')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Text</h3>
                    <p className="text-sm text-muted-foreground">Rich text content with formatting</p>
                  </div>
                </div>
              </div>

              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  newStepType === 'video_text' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setNewStepType('video_text')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Video className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Video + Text</h3>
                    <p className="text-sm text-muted-foreground">YouTube video with additional text</p>
                  </div>
                </div>
              </div>

              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  newStepType === 'quiz' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setNewStepType('quiz')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <QuizIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Quiz</h3>
                    <p className="text-sm text-muted-foreground">Interactive quiz with questions</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddStepModal(false);
                  setNewStepType('text');
                }}
              >
                Cancel
              </Button>
              <Button onClick={createStep} className="bg-blue-600 hover:bg-blue-700">
                Create Step
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

