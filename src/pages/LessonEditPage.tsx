import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import type { Course, CourseModule, Lesson, LessonContentType, Assignment, Question } from '../types';
import { ChevronDown, ChevronUp, Lock, HelpCircle, Settings, Save, ArrowLeft, Video, FileText, HelpCircle as QuizIcon } from 'lucide-react';
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quiz Title
            </label>
            <input
              type="text"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter quiz title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Score
            </label>
            <div className="flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
              <span className="text-gray-700">{quizQuestions.length} points</span>
            </div>
          </div>
        </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Time Limit (minutes) - Optional
        </label>
        <input
          type="number"
          value={quizTimeLimit || ''}
          onChange={(e) => setQuizTimeLimit(e.target.value ? parseInt(e.target.value) : undefined)}
          min="1"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Leave empty for no time limit"
        />
      </div>

      {/* Questions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Questions</h3>
          <button
            onClick={addQuestion}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Question
          </button>
        </div>

        <div className="space-y-4">
          {quizQuestions.map((question, questionIndex) => (
            <div key={question.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Question {questionIndex + 1}</h4>
                <button
                  onClick={() => removeQuestion(questionIndex)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Text
                  </label>
                  <input
                    type="text"
                    value={question.question_text}
                    onChange={(e) => updateQuestion(questionIndex, 'question_text', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your question"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question Type
                    </label>
                    <select
                      value={question.question_type}
                      onChange={(e) => updateQuestion(questionIndex, 'question_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="single_choice">Single Choice</option>
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="fill_blank">Fill in the Blank</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Points
                    </label>
                    <input
                      type="number"
                      value={question.points}
                      onChange={(e) => updateQuestion(questionIndex, 'points', parseInt(e.target.value) || 0)}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Options
                      </label>
                      <button
                        onClick={() => addOption(questionIndex)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Add Option
                      </button>
                    </div>
                    <div className="space-y-2">
                      {question.options?.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center gap-2">
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
                            className="text-blue-600 focus:ring-blue-500"
                          />
                                                     <input
                             type="text"
                             value={option.text}
                             onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                             className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                             placeholder={`Option ${optionIndex + 1}`}
                           />
                          {question.options && question.options.length > 2 && (
                            <button
                              onClick={() => removeOption(questionIndex, optionIndex)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {question.question_type === 'fill_blank' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correct Answer
                    </label>
                    <input
                      type="text"
                      value={question.correct_answer || ''}
                      onChange={(e) => updateQuestion(questionIndex, 'correct_answer', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter the correct answer"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {quizQuestions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No questions added yet. Click "Add Question" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const LessonSidebar = ({ course, modules, selectedLessonId, onLessonSelect }: LessonSidebarProps) => {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [moduleLectures, setModuleLectures] = useState<Map<string, Lesson[]>>(new Map());

  // Update expanded modules when modules are loaded
  useEffect(() => {
    if (modules.length > 0) {
      setExpandedModules(new Set(modules.map(m => m.id)));
    }
  }, [modules]);

  // Load lectures for all modules on component mount
  useEffect(() => {
    const loadAllLectures = async () => {
      try {
        // Use optimized endpoint to get all lessons for the course
        const allLessons = await apiClient.getCourseLessons(course?.id || '');
        
        // Group lessons by module
        const lecturesMap = new Map<string, Lesson[]>();
        for (const lesson of allLessons) {
          const moduleId = lesson.module_id;
          if (!lecturesMap.has(moduleId)) {
            lecturesMap.set(moduleId, []);
          }
          lecturesMap.get(moduleId)!.push(lesson);
        }
        
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
    <div className="w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 text-lg text-center">{course?.title || 'Course'}</span>
        </div>
      </div>
      
      <div className="p-4">
        <div className="space-y-2">
          {modules
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
            .map((module, moduleIndex) => {
            const lectures = moduleLectures.get(module.id) || [];
            const isExpanded = expandedModules.has(module.id);
            
            return (
              <div key={module.id}>
                <button
                  onClick={() => toggleModuleExpanded(module.id)}
                  className="w-full flex items-center justify-between p-2 hover:bg-gray-100 rounded text-left"
                >
                  <span className="text-sm text-gray-900 font-semibold">{moduleIndex + 1} {module.title}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
                </button>
                
                {isExpanded && (
                  <div className="ml-4 mt-2 space-y-1">
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
                      .map((lecture, lectureIndex) => (
                      <button
                        key={lecture.id}
                        onClick={() => onLessonSelect(lecture.id)}
                        className={`w-full flex items-center justify-between p-2 rounded text-left text-sm ${
                          selectedLessonId === lecture.id 
                            ? 'bg-green-600 text-white' 
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span>{moduleIndex + 1}.{lectureIndex + 1} {lecture.title}</span>
                        {selectedLessonId === lecture.id && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
      const courseData = await apiClient.fetchCourseById(courseId);
      setCourse(courseData);
      
      const modulesData = await apiClient.fetchModulesByCourse(courseId);
      setModules(modulesData);
      
      // Load lesson
      const lessonData = await apiClient.fetchLesson(lessonId);
      setLesson(lessonData);
      setLessonTitle(lessonData.title);
      setLessonContent(lessonData.content_text || '');
      setVideoUrl(lessonData.video_url || '');
      
      // Set content type and tab based on lesson data
      const lessonContentType = lessonData.content_type || 'video';
      setContentType(lessonContentType);
      
      // Map content type to tab
      if (lessonContentType === 'quiz') {
        setSelectedTab('quiz');
        // Load quiz data from lesson response
        if (lessonData.quiz_data) {
          setQuizTitle(lessonData.quiz_data.title || lessonData.title);
          setQuizQuestions(lessonData.quiz_data.questions || []);
          setQuizTimeLimit(lessonData.quiz_data.time_limit_minutes);
        } else {
          // Fallback to assignment loading for backward compatibility
          try {
            const assignments = await apiClient.getAssignments(lessonId);
            const quizAssignment = assignments.find((a: Assignment) => a.assignment_type === 'quiz');
            if (quizAssignment) {
              setCurrentAssignment(quizAssignment);
              setQuizTitle(quizAssignment.title);
              setQuizTimeLimit(quizAssignment.time_limit_minutes);
              // Parse questions from content
              try {
                const content = JSON.parse(quizAssignment.content);
                setQuizQuestions(content.questions || []);
              } catch (e) {
                console.error('Failed to parse quiz questions:', e);
                setQuizQuestions([]);
              }
            }
          } catch (error) {
            console.error('Failed to load quiz assignment:', error);
          }
        }
      } else if (lessonContentType === 'text') {
        setSelectedTab('text');
      } else {
        setSelectedTab('video');
      }
      
    } catch (error) {
      console.error('Failed to load lesson data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!lessonId) return;
    
    setIsSaving(true);
    try {
      // Prepare lesson update data based on content type
      const updateData: any = {
        title: lessonTitle,
        content_text: contentType === 'text' ? lessonContent : 
                    contentType === 'video' ? lessonContent : '',
        video_url: contentType === 'video' ? videoUrl : '',
        content_type: contentType,
        order_index: lesson?.order_index || 0
      };
      
      // Add quiz data if content type is quiz
      if (contentType === 'quiz') {
        updateData.quiz_data = {
          title: quizTitle || lessonTitle,
          questions: quizQuestions,
          time_limit_minutes: quizTimeLimit,
          max_score: quizQuestions.length
        };
      }
      
      // Update lesson
      const updatedLesson = await apiClient.updateLecture(lessonId, updateData);
      setLesson(updatedLesson);
      
      // Refresh the lesson list to ensure correct ordering
      if (course?.id) {
        const allLessons = await apiClient.getCourseLessons(course.id);
        
        // Group lessons by module
        const lecturesMap = new Map<string, Lesson[]>();
        for (const lesson of allLessons) {
          const moduleId = lesson.module_id;
          if (!lecturesMap.has(moduleId)) {
            lecturesMap.set(moduleId, []);
          }
          lecturesMap.get(moduleId)!.push(lesson);
        }
        
        // Update the modules state to trigger re-render of sidebar
        const updatedModules = await apiClient.fetchModulesByCourse(course.id);
        setModules(updatedModules);
      }
      
      // Clear localStorage after successful save
      clearLocalStorage(lessonId);
      
      // Show success message
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000); // Hide after 3 seconds
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
    <div className="flex h-screen bg-gray-100">
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
        <div className="bg-white border-b p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900">Lesson Settings</h1>
            <div className="flex items-center gap-2">
              {showSaveSuccess && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Lesson saved
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Lesson Title */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Lesson Title
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {remainingChars} characters remaining
                  </span>
                </div>
              </div>
              <input
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter lesson title"
              />
            </div>

            {/* Lesson Type Tabs */}
            <Tabs value={selectedTab} onValueChange={(value) => {
              setSelectedTab(value as 'video' | 'text' | 'quiz');
              setContentType(value as LessonContentType);
            }}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="video" className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Video
                </TabsTrigger>
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="quiz" className="flex items-center gap-2">
                  <QuizIcon className="w-4 h-4" />
                  Quiz
                </TabsTrigger>
              </TabsList>

              <TabsContent value="video" className="space-y-6">
                <VideoLessonEditor
                  lessonTitle={lessonTitle}
                  videoUrl={videoUrl}
                  videoError={videoError}
                  onVideoUrlChange={handleVideoUrlChange}
                  onClearUrl={() => handleVideoUrlChange('')}
                  onVideoError={handleVideoError}
                  content={lessonContent}
                  onContentChange={(content) => {
                    setLessonContent(content);
                    if (lessonId && !isLoading && contentType === 'video') {
                      const contentData = { videoUrl, lessonContent: content };
                      immediateAutoSave(lessonId, lessonTitle, contentData, contentType);
                    }
                  }}
                />
              </TabsContent>

              <TabsContent value="text" className="space-y-6">
                <TextLessonEditor
                  content={lessonContent}
                  onContentChange={(content) => {
                    setLessonContent(content);
                    if (lessonId && !isLoading && contentType === 'text') {
                      const contentData = { lessonContent: content };
                      immediateAutoSave(lessonId, lessonTitle, contentData, contentType);
                    }
                  }}
                />
              </TabsContent>

              <TabsContent value="quiz" className="space-y-6">
                <QuizLessonEditor
                  quizTitle={quizTitle}
                  setQuizTitle={setQuizTitle}
                  quizQuestions={quizQuestions}
                  setQuizQuestions={setQuizQuestions}
                  quizTimeLimit={quizTimeLimit}
                  setQuizTimeLimit={setQuizTimeLimit}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="bg-white border-t p-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/teacher/course/${courseId}`)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Course
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
             
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
