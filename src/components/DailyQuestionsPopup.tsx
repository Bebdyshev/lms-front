import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import type { DailyQuestionItem } from '../types';
import { Check, Loader2 } from 'lucide-react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

type QuestionWithSection = DailyQuestionItem & { section: 'math' | 'verbal' };

interface DailyQuestionsPopupProps {
  controlled?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onComplete?: () => void;
}

export default function DailyQuestionsPopup({ 
  controlled = false, 
  isOpen = false, 
  onOpenChange,
  onComplete 
}: DailyQuestionsPopupProps = {}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allQuestions, setAllQuestions] = useState<QuestionWithSection[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Use controlled or internal state
  const isDialogOpen = controlled ? isOpen : open;
  const setIsDialogOpen = (value: boolean) => {
    if (controlled && onOpenChange) {
      onOpenChange(value);
    } else {
      setOpen(value);
    }
  };

  const checkAndLoad = useCallback(async () => {
    if (!user || user.role !== 'student') return;
    
    // Skip auto-load if controlled mode
    if (controlled) return;
    
    // Check if dismissed for this session
    const dismissedKey = `daily_questions_dismissed_${user.id}_${new Date().toISOString().split('T')[0]}`;
    if (sessionStorage.getItem(dismissedKey)) return;

    try {
      setLoading(true);
      const status = await apiClient.getDailyQuestionsStatus();
      
      if (status.completed_today) {
        setCompleted(true);
        return;
      }

      // Try to load from localStorage first
      const today = new Date().toISOString().split('T')[0];
      const cacheKey = `daily_questions_${user.id}_${today}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          const questions: QuestionWithSection[] = [];
          
          if (parsed.mathRecommendations?.questions) {
            parsed.mathRecommendations.questions.forEach((q: any) => {
              const hasValidText = q.text && q.text !== '\\\\' && q.text !== '\\' && q.text !== '//' && q.text.trim() !== '';
              const hasImage = q.imageUrl && q.imageUrl !== 'None';
              
              if (hasValidText || hasImage) {
                questions.push({ ...q, section: 'math' });
              }
            });
          }
          
          if (parsed.verbalRecommendations?.questions) {
            parsed.verbalRecommendations.questions.forEach((q: any) => {
              const hasValidText = q.text && q.text !== '\\\\' && q.text !== '\\' && q.text !== '//' && q.text.trim() !== '';
              const hasImage = q.imageUrl && q.imageUrl !== 'None';
              
              if (hasValidText || hasImage) {
                questions.push({ ...q, section: 'verbal' });
              }
            });
          }
          
          if (questions.length > 0) {
            setAllQuestions(questions);
            setIsDialogOpen(true);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Failed to parse cached questions:', e);
          localStorage.removeItem(cacheKey);
        }
      }

      // Fetch recommendations from API
      const recs = await apiClient.getDailyQuestionsRecommendations();
      
      // Save to localStorage for today
      localStorage.setItem(cacheKey, JSON.stringify(recs));
      
      // Clean up old cache entries (older than today)
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.startsWith(`daily_questions_${user.id}_`) && !key.endsWith(today)) {
          localStorage.removeItem(key);
        }
      });

      // Combine math + verbal questions
      const questions: QuestionWithSection[] = [];
      if (recs.mathRecommendations?.questions) {
        recs.mathRecommendations.questions.forEach(q => {
          // Only add questions that have either text or image
          const hasValidText = q.text && q.text !== '\\\\' && q.text !== '\\' && q.text !== '//' && q.text.trim() !== '';
          const hasImage = q.imageUrl && q.imageUrl !== 'None';
          
          if (hasValidText || hasImage) {
            questions.push({ ...q, section: 'math' });
          } else {
            console.warn('Skipping math question without content:', q);
          }
        });
      }
      if (recs.verbalRecommendations?.questions) {
        recs.verbalRecommendations.questions.forEach(q => {
          // Only add questions that have either text or image
          const hasValidText = q.text && q.text !== '\\\\' && q.text !== '\\' && q.text !== '//' && q.text.trim() !== '';
          const hasImage = q.imageUrl && q.imageUrl !== 'None';
          
          if (hasValidText || hasImage) {
            questions.push({ ...q, section: 'verbal' });
          } else {
            console.warn('Skipping verbal question without content:', q);
          }
        });
      }

      if (questions.length > 0) {
        setAllQuestions(questions);
        setIsDialogOpen(true);
      } else {
        setError('No questions available. Please complete some tests first.');
      }
    } catch (err: any) {
      console.error('Failed to load daily questions:', err);
      const errorMessage = err?.response?.data?.detail || err?.message || 'Failed to load daily questions';
      setError(errorMessage);
      
      // Still open dialog to show error in controlled mode
      if (controlled) {
        setIsDialogOpen(true);
      }
    } finally {
      setLoading(false);
    }
  }, [user, controlled]);

  useEffect(() => {
    // Small delay to not block initial page load (only in auto mode)
    if (!controlled) {
      const timer = setTimeout(checkAndLoad, 2000);
      return () => clearTimeout(timer);
    }
  }, [checkAndLoad, controlled]);

  // Load data when controlled dialog opens
  useEffect(() => {
    if (controlled && isOpen && allQuestions.length === 0) {
      loadQuestions();
    }
  }, [controlled, isOpen]);

  const loadQuestions = async () => {
    if (!user || user.role !== 'student') return;

    try {
      setLoading(true);
      setError(null);
      
      // Try to load from localStorage first
      const today = new Date().toISOString().split('T')[0];
      const cacheKey = `daily_questions_${user.id}_${today}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      let recs;
      
      if (cachedData) {
        try {
          recs = JSON.parse(cachedData);
          console.log('Loaded questions from cache');
        } catch (e) {
          console.warn('Failed to parse cached questions:', e);
          localStorage.removeItem(cacheKey);
          recs = await apiClient.getDailyQuestionsRecommendations();
          localStorage.setItem(cacheKey, JSON.stringify(recs));
        }
      } else {
        recs = await apiClient.getDailyQuestionsRecommendations();
        localStorage.setItem(cacheKey, JSON.stringify(recs));
        
        // Clean up old cache entries
        const allKeys = Object.keys(localStorage);
        allKeys.forEach(key => {
          if (key.startsWith(`daily_questions_${user.id}_`) && !key.endsWith(today)) {
            localStorage.removeItem(key);
          }
        });
      }

      // Combine math + verbal questions
      const questions: QuestionWithSection[] = [];
      if (recs.mathRecommendations?.questions) {
        recs.mathRecommendations.questions.forEach((q: any) => {
          const hasValidText = q.text && q.text !== '\\\\' && q.text !== '\\' && q.text !== '//' && q.text.trim() !== '';
          const hasImage = q.imageUrl && q.imageUrl !== 'None';
          
          if (hasValidText || hasImage) {
            questions.push({ ...q, section: 'math' });
          }
        });
      }
      if (recs.verbalRecommendations?.questions) {
        recs.verbalRecommendations.questions.forEach((q: any) => {
          const hasValidText = q.text && q.text !== '\\\\' && q.text !== '\\' && q.text !== '//' && q.text.trim() !== '';
          const hasImage = q.imageUrl && q.imageUrl !== 'None';
          
          if (hasValidText || hasImage) {
            questions.push({ ...q, section: 'verbal' });
          }
        });
      }

      setAllQuestions(questions);
    } catch (err: any) {
      console.error('Failed to load daily questions:', err);
      const errorMessage = err?.response?.data?.detail || err?.message || 'Failed to load daily questions';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    if (user) {
      const dismissedKey = `daily_questions_dismissed_${user.id}_${new Date().toISOString().split('T')[0]}`;
      sessionStorage.setItem(dismissedKey, 'true');
    }
    setDismissed(true);
    setIsDialogOpen(false);
  };

  const handleComplete = async () => {
    try {
      setCompleting(true);
      await apiClient.completeDailyQuestions({
        answers,
        questions: allQuestions.map(q => ({
          questionId: q.questionId,
          section: q.section,
          primaryTag: q.primaryTag
        }))
      });
      setCompleted(true);
      
      // Call onComplete callback if provided
      if (onComplete) {
        onComplete();
      }
      
      setTimeout(() => setIsDialogOpen(false), 1500);
    } catch (err) {
      console.error('Failed to complete daily questions:', err);
    } finally {
      setCompleting(false);
    }
  };

  const currentQuestion = allQuestions[currentIndex];
  const isLastQuestion = currentIndex === allQuestions.length - 1;
  const answeredCount = Object.keys(answers).length;

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Easy';
      case 'medium': return 'Medium';
      case 'hard': return 'Hard';
      default: return difficulty;
    }
  };

  const getSectionLabel = (section: 'math' | 'verbal') => {
    return section === 'math' ? 'Math' : 'Verbal';
  };

  const formatTag = (tag: string) => {
    return tag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const isTextEmpty = (text?: string) => {
    if (!text) return true;
    const trimmed = text.trim();
    return trimmed === '' || trimmed === '\\\\' || trimmed === '\\' || trimmed === '//';
  };

  const formatQuestionText = (text: string) => {
    // Don't process if text is empty or invalid
    if (!text || isTextEmpty(text)) return '';
    
    // Split text by LaTeX delimiters
    const parts: JSX.Element[] = [];
    let currentIndex = 0;
    let key = 0;
    
    // Regular expression to match inline math $...$ or display math $$...$$
    // Also matches \frac{}{}, \text{}, and other LaTeX commands
    const latexPattern = /\$\$(.+?)\$\$|\$(.+?)\$|\\frac\{[^}]+\}\{[^}]+\}|\\text\{([^}]+)\}|\\[a-zA-Z]+/g;
    let match;
    
    while ((match = latexPattern.exec(text)) !== null) {
      // Add text before the match
      if (match.index > currentIndex) {
        parts.push(
          <span key={`text-${key++}`}>
            {text.substring(currentIndex, match.index)}
          </span>
        );
      }
      
      // Handle \text{...} specially - just show the content without LaTeX rendering
      if (match[0].startsWith('\\text{')) {
        const textContent = match[3] || match[0].replace(/\\text\{([^}]+)\}/, '$1');
        parts.push(<span key={`text-${key++}`}>{textContent}</span>);
        currentIndex = match.index + match[0].length;
        continue;
      }
      
      // Add the LaTeX part
      const latexContent = match[1] || match[2] || match[0];
      const isDisplayMath = match[1] !== undefined; // $$...$$ format
      
      try {
        if (isDisplayMath) {
          parts.push(<BlockMath key={`math-${key++}`} math={latexContent} />);
        } else {
          // For inline math, remove wrapping $ if present
          const cleanLatex = latexContent.replace(/^\$|\$$/g, '');
          parts.push(<InlineMath key={`math-${key++}`} math={cleanLatex} />);
        }
      } catch (e) {
        // If LaTeX parsing fails, show the original text
        console.warn('LaTeX parsing error:', e, 'for:', match[0]);
        parts.push(<span key={`error-${key++}`}>{match[0]}</span>);
      }
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(
        <span key={`text-${key++}`}>
          {text.substring(currentIndex)}
        </span>
      );
    }
    
    return parts.length > 0 ? <>{parts}</> : text;
  };

  // Don't render if not student, already completed (in auto mode), or dismissed (in auto mode)
  if (!user || user.role !== 'student') return null;
  if (!controlled && (completed || dismissed)) return null;

  return (
    <Dialog open={isDialogOpen} onOpenChange={(val) => { if (!val) handleDismiss(); }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader className="border-b pb-4">
          <div>
            <DialogTitle className="text-xl font-semibold">Daily Questions</DialogTitle>
            <DialogDescription className="mt-1 text-sm">
              Solve these questions to improve your weak areas
            </DialogDescription>
          </div>

          {/* Progress indicator */}
          {allQuestions.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / allQuestions.length) * 100}%` }}
                />
              </div>
              <span className="text-sm text-gray-600 font-medium whitespace-nowrap">
                {currentIndex + 1} / {allQuestions.length}
              </span>
            </div>
          )}
        </DialogHeader>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Loading questions...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">😅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Oops! Something went wrong</h3>
            <p className="text-gray-600 mb-6">
              {error.includes('404') || error.includes('No questions available') 
                ? "You haven't completed any Weekly Tests yet. Complete a test first to get personalized daily questions!" 
                : "We couldn't load your daily questions right now. Please try again later."}
            </p>
            <Button variant="outline" onClick={handleDismiss}>Close</Button>
          </div>
        ) : currentQuestion ? (
          <div className="pt-4">
            {/* Question metadata */}
            <div className="flex items-center gap-2 mb-4 flex-wrap text-sm">
              <span className="text-gray-600">{getSectionLabel(currentQuestion.section)}</span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-600">{getDifficultyLabel(currentQuestion.difficulty)}</span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-500">{formatTag(currentQuestion.primaryTag)}</span>
              {currentQuestion.questionType && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-500">{currentQuestion.questionType}</span>
                </>
              )}
            </div>

            {/* Passage text (for verbal questions) */}
            {currentQuestion.passageText && (
              <div className="mb-5 p-4 bg-gray-50 border border-gray-200 rounded-md max-h-[200px] overflow-y-auto">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Passage</p>
                <div 
                  className="text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: currentQuestion.passageText }}
                />
              </div>
            )}

            {/* Question text */}
            {!isTextEmpty(currentQuestion.text) && (
              <div className="mb-5 text-gray-900 text-base leading-relaxed">
                {formatQuestionText(currentQuestion.text)}
              </div>
            )}

            {/* Question image */}
            {currentQuestion.imageUrl && (
              <div className="mb-5 rounded-md overflow-hidden border border-gray-200 bg-white">
                <img 
                  src={currentQuestion.imageUrl}
                  alt="Question"
                  className="w-full h-auto object-contain"
                  loading="lazy"
                  onError={() => {
                    console.error('Failed to load image:', currentQuestion.imageUrl);
                  }}
                />
              </div>
            )}

            {/* Answer section */}
            <div className="mb-6">
              {(currentQuestion.isMultipleChoice || currentQuestion.questionType === 'Multiple Choice' || (currentQuestion.optionA && currentQuestion.optionB)) ? (
                // Multiple choice options
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Choose an answer:</p>
                  <div className="space-y-2">
                    {(['A', 'B', 'C', 'D'] as const).map(letter => {
                      const optionKey = `option${letter}` as 'optionA' | 'optionB' | 'optionC' | 'optionD';
                      const optionText = currentQuestion[optionKey];
                      if (!optionText) return null;
                      
                      const isSelected = answers[currentQuestion.questionId] === letter;
                      
                      return (
                        <label 
                          key={letter}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${currentQuestion.questionId}`}
                            value={letter}
                            checked={isSelected}
                            onChange={() => setAnswers(prev => ({
                              ...prev,
                              [currentQuestion.questionId]: letter
                            }))}
                            className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-800 flex-1">
                            <span className="font-medium text-gray-600 mr-2">{letter}.</span>
                            {formatQuestionText(optionText)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                // Free text input (Student Response)
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your answer:
                  </label>
                  <input
                    type="text"
                    value={answers[currentQuestion.questionId] || ''}
                    onChange={(e) => setAnswers(prev => ({ 
                      ...prev, 
                      [currentQuestion.questionId]: e.target.value 
                    }))}
                    placeholder="Enter your answer..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                size="sm"
              >
                Back
              </Button>

              <span className="text-sm text-gray-500">
                Answered: {answeredCount} / {allQuestions.length}
              </span>

              {isLastQuestion ? (
                <Button
                  onClick={handleComplete}
                  disabled={completing}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {completing ? 'Saving...' : 'Complete'}
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentIndex(Math.min(allQuestions.length - 1, currentIndex + 1))}
                  size="sm"
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {/* Completion state */}
        {completed && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Great job!</h3>
            <p className="text-sm text-gray-600">Daily questions completed</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
