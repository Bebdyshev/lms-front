import { useState } from 'react';
import { Button } from '../ui/button';
import { CheckCircle, ChevronRight } from 'lucide-react';
import { renderTextWithLatex } from '../../utils/latex';
import type { Step } from '../../types';
import { useNavigate } from 'react-router-dom';
import { LongTextQuestion } from './quiz/LongTextQuestion';
import { ShortAnswerQuestion } from './quiz/ShortAnswerQuestion';
import { ChoiceQuestion } from './quiz/ChoiceQuestion';
import { TextCompletionQuestion } from './quiz/TextCompletionQuestion';
import { FillInBlankQuestion } from './quiz/FillInBlankQuestion';

// Define a more specific type for quiz questions if possible
type QuizQuestion = any;
type QuizData = any;

interface QuizRendererProps {
  quizState: 'title' | 'question' | 'result' | 'completed' | 'feed';
  quizData: QuizData;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  quizAnswers: Map<string, any>;
  gapAnswers: Map<string, string[]>;
  feedChecked: boolean;
  startQuiz: () => void;
  handleQuizAnswer: (questionId: string, answer: any) => void;
  setGapAnswers: React.Dispatch<React.SetStateAction<Map<string, string[]>>>;
  checkAnswer: () => void;
  nextQuestion: () => void;
  resetQuiz: () => void;
  getScore: () => { score: number; total: number; };
  isCurrentAnswerCorrect: () => boolean;
  getCurrentQuestion: () => QuizQuestion | null;
  getCurrentUserAnswer: () => any;
  goToNextStep: () => void;
  setQuizCompleted: React.Dispatch<React.SetStateAction<Map<string, boolean>>>;
  markStepAsVisited: (stepId: string, timeSpent?: number) => Promise<void>;
  currentStep: Step | undefined;
  saveQuizAttempt: (score: number, totalQuestions: number) => Promise<void>;
  setFeedChecked: React.Dispatch<React.SetStateAction<boolean>>;
  getGapStatistics: () => { totalGaps: number; correctGaps: number; regularQuestions: number; correctRegular: number; };
  setQuizAnswers: React.Dispatch<React.SetStateAction<Map<string, any>>>;
  steps: Step[];
  goToStep: (index: number) => void;
  currentStepIndex: number;
  nextLessonId: string | null;
  courseId: string | undefined;
  finishQuiz: () => void;
  reviewQuiz: () => void;
  autoFillCorrectAnswers: () => void;
  quizAttempt?: any;
}

const QuizRenderer = (props: QuizRendererProps) => {
  const {
    quizState,
    quizData,
    questions,
    currentQuestionIndex,
    quizAnswers,
    gapAnswers,
    feedChecked,
    startQuiz,
    handleQuizAnswer,
    setGapAnswers,
    checkAnswer,
    nextQuestion,
    resetQuiz,
    isCurrentAnswerCorrect,
    getCurrentQuestion,
    getCurrentUserAnswer,
    goToNextStep,
    setQuizCompleted,
    markStepAsVisited,
    currentStep,
    setFeedChecked,
    getGapStatistics,
    setQuizAnswers,
    finishQuiz,
    reviewQuiz,
    autoFillCorrectAnswers,
    quizAttempt,
  } = props;

  const navigate = useNavigate();

  // Calculate total number of "questions" considering gaps in fill_blank and text_completion
  const getTotalQuestionCount = () => {
    if (!questions || questions.length === 0) return 0;

    return questions.reduce((total, q) => {
      if (q.question_type === 'fill_blank' || q.question_type === 'text_completion') {
        // Count the number of gaps in the question
        const text = q.content_text || q.question_text || '';
        const gaps = text.match(/\[\[(.*?)\]\]/g);
        return total + (gaps ? gaps.length : 1);
      }
      return total + 1;
    }, 0);
  };

  const totalQuestionCount = getTotalQuestionCount();

  // All render functions will be moved here from LessonPage.tsx
  // For now, this is a placeholder.
  // The actual implementation will be added in the next steps.

  // Get the display number for a question (accounting for gaps in previous questions)
  const getQuestionDisplayNumber = (questionIndex: number) => {
    let displayNumber = 1;
    for (let i = 0; i < questionIndex; i++) {
      const q = questions[i];
      if (q.question_type === 'fill_blank' || q.question_type === 'text_completion') {
        const text = q.content_text || q.question_text || '';
        const gaps = text.match(/\[\[(.*?)\]\]/g);
        displayNumber += gaps ? gaps.length : 1;
      } else {
        displayNumber += 1;
      }
    }
    return displayNumber;
  };

  const renderQuizFeed = () => {
    if (!questions || questions.length === 0) return null;

    return (
      <div className="max-w-3xl mx-auto space-y-6 p-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Quick Practice</h2>
          <p className="text-gray-600">Answer all questions below to continue</p>

          {/* Development Helper Button */}
          {import.meta.env.DEV && (
            <Button
              onClick={autoFillCorrectAnswers}
              className="mt-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-semibold shadow-md transition-all"
              title="Development only: Auto-fill correct answers"
            >
              🔧 Dev: Fill Correct Answers
            </Button>
          )}
        </div>

        {/* Quiz-level Media for Audio/PDF/Text Quizzes */}
        {quizData?.quiz_media_url && (
          <div className="bg-white rounded-lg border p-6 mb-6">
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
            const displayNumber = getQuestionDisplayNumber(idx);
            const questionGaps = (q.question_type === 'fill_blank' || q.question_type === 'text_completion')
              ? (q.content_text || q.question_text || '').match(/\[\[(.*?)\]\]/g)?.length || 1
              : 1;

            return (
              <div key={q.id} className="bg-white rounded-xl border">
                <div className="p-6">
                  {/* Question Number Badge */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {displayNumber}
                    </div>
                    <span className="text-sm font-medium text-gray-500">
                      Question{questionGaps > 1 ? 's' : ''} {displayNumber}{questionGaps > 1 ? `-${displayNumber + questionGaps - 1}` : ''} of {totalQuestionCount}
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
                  {q.content_text && q.content_text.trim() && q.question_type !== 'text_completion' && q.question_type !== 'fill_blank' && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-4 border-l-3 border-blue-400">
                      <div className="text-gray-700 prose max-w-none" dangerouslySetInnerHTML={{ __html: renderTextWithLatex(q.content_text) }} />
                    </div>
                  )}

                  {/* Question */}
                  {q.question_type !== 'text_completion' && (
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      <span dangerouslySetInnerHTML={{ __html: renderTextWithLatex(q.question_text.replace(/\[\[([^\]]+)\]\]/g, '[[blank]]')) }} />
                    </h3>
                  )}

                  {q.question_type === 'text_completion' && (
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Fill in the blanks:
                    </h3>
                  )}

                  {/* Answer Input Based on Question Type */}
                  {q.question_type === 'long_text' ? (
                    <LongTextQuestion
                      question={q}
                      value={userAnswer}
                      onChange={(val) => setQuizAnswers(prev => new Map(prev.set(q.id.toString(), val)))}
                      disabled={feedChecked}
                    />
                  ) : q.question_type === 'short_answer' ? (
                    <ShortAnswerQuestion
                      question={q}
                      value={userAnswer}
                      onChange={(val) => setQuizAnswers(prev => new Map(prev.set(q.id.toString(), val)))}
                      disabled={feedChecked}
                      showResult={feedChecked}
                    />
                  ) : q.question_type === 'text_completion' ? (
                    <TextCompletionQuestion
                      question={q}
                      answers={gapAnswers.get(q.id.toString()) || []}
                      onAnswerChange={(idx, val) => {
                        const currentAnswers = gapAnswers.get(q.id.toString()) || [];
                        const newAnswers = [...currentAnswers];
                        newAnswers[idx] = val;
                        setGapAnswers(prev => new Map(prev.set(q.id.toString(), newAnswers)));
                      }}
                      disabled={feedChecked}
                      showResult={feedChecked}
                    />
                  ) : q.question_type === 'single_choice' || q.question_type === 'multiple_choice' || q.question_type === 'media_question' ? (
                    <ChoiceQuestion
                      question={q}
                      value={userAnswer}
                      onChange={(val) => setQuizAnswers(prev => new Map(prev.set(q.id.toString(), val)))}
                      disabled={feedChecked}
                      showResult={feedChecked}
                    />
                  ) : (
                    <FillInBlankQuestion
                      question={q}
                      answers={gapAnswers.get(q.id.toString()) || []}
                      onAnswerChange={(idx, val) => {
                        const currentAnswers = gapAnswers.get(q.id.toString()) || [];
                        const newAnswers = [...currentAnswers];
                        newAnswers[idx] = val;
                        setGapAnswers(prev => new Map(prev.set(q.id.toString(), newAnswers)));
                      }}
                      disabled={feedChecked}
                      showResult={feedChecked}
                    />
                  )}

                  {/* Result Indicator */}
                  {feedChecked && (() => {
                    let isCorrect = false;
                    if (q.question_type === 'fill_blank') {
                      const answers: string[] = Array.isArray(q.correct_answer) ? q.correct_answer : (q.correct_answer ? [q.correct_answer] : []);
                      const current = gapAnswers.get(q.id.toString()) || new Array(answers.length).fill('');
                      isCorrect = current.every((val, idx) => (val || '').toString().trim().toLowerCase() === (answers[idx] || '').toString().trim().toLowerCase());
                    } else {
                      isCorrect = userAnswer === q.correct_answer;
                    }
                    return isCorrect ? (
                      <div className="mt-4 flex items-center gap-2">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Correct!
                        </span>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center pt-4">
          {!feedChecked ? (
            <Button
              onClick={() => {
                setFeedChecked(true);
                finishQuiz();
              }}
              disabled={questions.some(q => {
                const ans = quizAnswers.get(q.id);
                if (q.question_type === 'fill_blank') {
                  const gapAns = gapAnswers.get(q.id.toString()) || [];
                  return gapAns.length === 0 || gapAns.some(v => (v || '').toString().trim() === '');
                }
                if (q.question_type === 'text_completion') {
                  const gapAns = gapAnswers.get(q.id.toString()) || [];
                  return gapAns.length === 0 || gapAns.some(v => (v || '').toString().trim() === '');
                }
                if (q.question_type === 'short_answer' || q.question_type === 'long_text') {
                  return !ans || (ans || '').toString().trim() === '';
                }
                return ans === undefined;
              })}
              className={`px-8 py-3 rounded-lg text-lg font-semibold transition-all duration-200 ${questions.some(q => {
                const ans = quizAnswers.get(q.id);
                if (q.question_type === 'fill_blank') {
                  const gapAns = gapAnswers.get(q.id.toString()) || [];
                  return gapAns.length === 0 || gapAns.some(v => (v || '').toString().trim() === '');
                }
                if (q.question_type === 'text_completion') {
                  const gapAns = gapAnswers.get(q.id.toString()) || [];
                  return gapAns.length === 0 || gapAns.some(v => (v || '').toString().trim() === '');
                }
                if (q.question_type === 'short_answer' || q.question_type === 'long_text') {
                  return !ans || (ans || '').toString().trim() === '';
                }
                return ans === undefined;
              })
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white transition-all"
              }`}
            >
              Check All Answers
            </Button>
          ) : (() => {
            const stats = getGapStatistics();
            const totalItems = stats.totalGaps + stats.regularQuestions;
            const correctItems = stats.correctGaps + stats.correctRegular;
            const scorePercentage = totalItems > 0 ? (correctItems / totalItems) * 100 : 0;
            const isPassed = scorePercentage >= 50;

            return (
              <div className="flex flex-col items-center space-y-4">
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
                <Button
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
                  className="bg-green-600 hover:bg-green-700 text-white transition-all text-lg font-semibold items-center content-center"
                >
                  {isPassed ? 'Continue to Next Step' : 'Retry Quiz'}
                </Button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  const renderQuizTitleScreen = () => {
    // Show beautiful Duolingo-style screen for all modes
    return (
      <div className="min-h-[500px] relative flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 -mx-4 -my-4 p-8 rounded-lg overflow-hidden">
        {/* Logo in bottom-left corner */}
        <div className="absolute bottom-0 left-0">
          <img
            src="/logo-half.svg"
            alt="Logo"
            className="w-64 h-64 md:w-80 md:h-80 brightness-0 invert"
          />
        </div>

        {/* Logo in bottom-right corner */}
        <div className="absolute bottom-0 right-0">
          <img
            src="/logo-half.svg"
            alt="Logo"
            className="w-64 h-64 md:w-80 md:h-80 brightness-0 invert scale-x-[-1]"
          />
        </div>

        {/* Logo at top center - showing only bottom half */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <img
            src="/logo.svg"
            alt="Logo"
            className="w-80 h-80 md:w-96 md:h-96 brightness-0 invert"
          />
        </div>

        <div className="text-center space-y-6 max-w-2xl">
          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight">
              {quizData?.title || 'Quiz incoming!'}
            </h1>
            <p className="text-[15px] md:text-[18px] text-blue-100 font-light">
              it's your time to shine
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <Button
              onClick={startQuiz}
              className="px-10 py-4 bg-white text-blue-900 text-lg font-bold hover:bg-blue-50"
            >
              Start Practice
            </Button>

            <div className="inline-flex items-center justify-center gap-2 text-white text-base md:text-lg">
              <span className="font-medium">{totalQuestionCount} question{totalQuestionCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderQuizQuestion = () => {
    if (!questions || questions.length === 0) return null;
    const q = questions[currentQuestionIndex];
    if (!q) return null;

    const userAnswer = quizAnswers.get(q.id);
    const displayNumber = getQuestionDisplayNumber(currentQuestionIndex);
    const questionGaps = (q.question_type === 'fill_blank' || q.question_type === 'text_completion')
      ? (q.content_text || q.question_text || '').match(/\[\[(.*?)\]\]/g)?.length || 1
      : 1;

    return (
      <div className="max-w-3xl mx-auto space-y-6 p-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Quiz Question</h2>
          <p className="text-gray-600">
            Question{questionGaps > 1 ? 's' : ''} {displayNumber}{questionGaps > 1 ? `-${displayNumber + questionGaps - 1}` : ''} of {totalQuestionCount}
          </p>
        </div>

        {/* Quiz-level Media for Audio/PDF/Text Quizzes */}
        {quizData?.quiz_media_url && (
          <div className="bg-white rounded-lg border p-6 mb-6">
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

        <div className="bg-white rounded-xl">
          <div className="p-6">
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
            {q.content_text && q.content_text.trim() && q.question_type !== 'text_completion' && q.question_type !== 'fill_blank' && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4 border-l-3 border-blue-400">
                <div className="text-gray-700 prose max-w-none" dangerouslySetInnerHTML={{ __html: renderTextWithLatex(q.content_text) }} />
              </div>
            )}

            {/* Question */}
            {q.question_type !== 'text_completion' && (
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                <span dangerouslySetInnerHTML={{ __html: renderTextWithLatex(q.question_text.replace(/\[\[([^\]]+)\]\]/g, '[[blank]]')) }} />
              </h3>
            )}

            {q.question_type === 'text_completion' && (
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Fill in the blanks:
              </h3>
            )}

            {/* Answer Input Based on Question Type */}
            {q.question_type === 'long_text' ? (
              <LongTextQuestion
                question={q}
                value={userAnswer}
                onChange={(val) => handleQuizAnswer(q.id.toString(), val)}
                disabled={false}
              />
            ) : q.question_type === 'short_answer' ? (
              <ShortAnswerQuestion
                question={q}
                value={userAnswer}
                onChange={(val) => handleQuizAnswer(q.id.toString(), val)}
                disabled={false}
                showResult={false}
              />
            ) : q.question_type === 'text_completion' ? (
              <TextCompletionQuestion
                question={q}
                answers={gapAnswers.get(q.id.toString()) || []}
                onAnswerChange={(idx, val) => {
                  const currentAnswers = gapAnswers.get(q.id.toString()) || [];
                  const newAnswers = [...currentAnswers];
                  newAnswers[idx] = val;
                  setGapAnswers(prev => new Map(prev.set(q.id.toString(), newAnswers)));
                }}
                disabled={false}
                showResult={false}
              />
            ) : q.question_type === 'single_choice' || q.question_type === 'multiple_choice' || q.question_type === 'media_question' ? (
              <ChoiceQuestion
                question={q}
                value={userAnswer}
                onChange={(val) => handleQuizAnswer(q.id.toString(), val)}
                disabled={false}
                showResult={false}
              />
            ) : (
              <FillInBlankQuestion
                question={q}
                answers={gapAnswers.get(q.id.toString()) || []}
                onAnswerChange={(idx, val) => {
                  const currentAnswers = gapAnswers.get(q.id.toString()) || [];
                  const newAnswers = [...currentAnswers];
                  newAnswers[idx] = val;
                  setGapAnswers(prev => new Map(prev.set(q.id.toString(), newAnswers)));
                }}
                disabled={false}
                showResult={false}
              />
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={checkAnswer}
            disabled={(() => {
              const ans = quizAnswers.get(q.id);
              if (q.question_type === 'fill_blank') {
                const gapAns = gapAnswers.get(q.id.toString()) || [];
                return gapAns.length === 0 || gapAns.some(v => (v || '').toString().trim() === '');
              }
              if (q.question_type === 'text_completion') {
                const gapAns = gapAnswers.get(q.id.toString()) || [];
                return gapAns.length === 0 || gapAns.some(v => (v || '').toString().trim() === '');
              }
              if (q.question_type === 'short_answer' || q.question_type === 'long_text') {
                return !ans || (ans || '').toString().trim() === '';
              }
              return ans === undefined;
            })()}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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

    // Calculate progress based on actual question items (including gaps)
    const displayNumber = getQuestionDisplayNumber(currentQuestionIndex);
    const questionGaps = (question.question_type === 'fill_blank' || question.question_type === 'text_completion')
      ? (question.content_text || question.question_text || '').match(/\[\[(.*?)\]\]/g)?.length || 1
      : 1;
    const currentEndNumber = displayNumber + questionGaps - 1;
    const progress = (currentEndNumber / totalQuestionCount) * 100;

    return (
      <div className="max-w-4xl mx-auto space-y-8 p-6">
        {/* Progress Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-700">
              Question{questionGaps > 1 ? 's' : ''} {displayNumber}{questionGaps > 1 ? `-${currentEndNumber}` : ''} of {totalQuestionCount}
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


        {/* Question Review */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="p-8">
            {/* Content Text / Passage */}
            {question.content_text && question.content_text.trim() && question.question_type !== 'text_completion' && question.question_type !== 'fill_blank' && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4 border-l-3 border-blue-400">
                <div className="text-gray-700 prose max-w-none" dangerouslySetInnerHTML={{ __html: renderTextWithLatex(question.content_text) }} />
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

            {question.question_type !== 'fill_blank' && question.question_type !== 'text_completion' ? (
              /* Options Review - Use the same component for consistency */
              <ChoiceQuestion
                question={question}
                value={userAnswer}
                onChange={() => {}}
                disabled={true}
                showResult={true}
              />
            ) : (
              /* Fill-in-the-gaps Review */
              <div className="p-6 rounded-xl border-2 bg-gray-50 border-gray-200">
                {(() => {
                  const answers: string[] = Array.isArray(question.correct_answer) ? question.correct_answer : (question.correct_answer ? [question.correct_answer] : []);
                  const current = gapAnswers.get(question.id.toString()) || new Array(answers.length).fill('');

                  if (question.question_type === 'fill_blank') {
                    return (
                      <FillInBlankQuestion
                        question={question}
                        answers={current}
                        onAnswerChange={() => { }}
                        disabled={true}
                        showResult={true}
                      />
                    );
                  } else {
                    // Text completion fallback or implementation
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
                            <span key={`gap-review-${i}`} className={`inline-flex items-center px-3 py-1 mx-1 rounded-md font-medium ${isCorrectGap
                              ? 'bg-green-200 text-green-800 border-2 border-green-300'
                              : 'bg-red-200 text-red-800 border-2 border-red-300'
                              }`}>
                              {userAnswer || `[Gap ${idx + 1}]`}
                              {/* Correct answer hidden */}
                            </span>
                          );
                        })}
                      </div>
                    );
                  }
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

  const [showAllAnswers, setShowAllAnswers] = useState(false);

  const renderQuizCompleted = () => {
    // Check for long text questions
    const hasLongText = questions.some(q => q.question_type === 'long_text');
    
    // Determine if grading is pending
    // If it has long text and (no attempt record OR attempt is not graded), it's pending
    const isPending = hasLongText && (!quizAttempt || !quizAttempt.is_graded);

    if (isPending) {
      return (
        <div className="max-w-2xl mx-auto text-center space-y-6 p-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Submission Received
          </h1>
          <div className="p-8 rounded-2xl border bg-yellow-50 border-yellow-200">
             <div className="text-6xl mb-4">📝</div>
             <h2 className="text-xl font-bold text-yellow-800 mb-2">Pending Teacher Review</h2>
             <p className="text-yellow-700">
               Your quiz includes long text questions that require manual grading. 
               Your score will be updated once the teacher reviews your answers.
             </p>
          </div>
          <div className="flex justify-center">
             <Button onClick={goToNextStep} className="bg-blue-600 hover:bg-blue-700 text-white">
               Continue to Next Step
             </Button>
          </div>
        </div>
      );
    }

    const stats = getGapStatistics();

    // Calculate total "items" (gaps + regular questions)
    const totalItems = stats.totalGaps + stats.regularQuestions;
    const correctItems = stats.correctGaps + stats.correctRegular;
    
    // For graded quizzes (especially long text), use the teacher-assigned score
    // Otherwise calculate from correct/total
    const percentage = (quizAttempt && quizAttempt.is_graded && quizAttempt.score_percentage !== undefined)
      ? Math.round(quizAttempt.score_percentage)
      : (totalItems > 0 ? Math.round((correctItems / totalItems) * 100) : 0);
    const isPassed = percentage >= 50;

    if (showAllAnswers) {
      return (
        <div className="max-w-3xl mx-auto space-y-6 p-4">
          <div className="text-center space-y-2 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Correct Answers</h2>
            <p className="text-gray-600">Review your answers below</p>
          </div>

          <div className="space-y-6">
            {questions.map((q, idx) => {
              const userAnswer = quizAnswers.get(q.id);
              const displayNumber = getQuestionDisplayNumber(idx);
              const questionGaps = (q.question_type === 'fill_blank' || q.question_type === 'text_completion')
                ? (q.content_text || q.question_text || '').match(/\[\[(.*?)\]\]/g)?.length || 1
                : 1;

              return (
                <div key={q.id} className="bg-white rounded-xl border">
                  <div className="p-6">
                    {/* Question Number Badge */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {displayNumber}
                      </div>
                      <span className="text-sm font-medium text-gray-500">
                        Question{questionGaps > 1 ? 's' : ''} {displayNumber}{questionGaps > 1 ? `-${displayNumber + questionGaps - 1}` : ''} of {totalQuestionCount}
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
                    {q.content_text && q.content_text.trim() && q.question_type !== 'text_completion' && q.question_type !== 'fill_blank' && (
                      <div className="bg-gray-50 p-4 rounded-lg mb-4 border-l-3 border-blue-400">
                        <div className="text-gray-700 prose max-w-none" dangerouslySetInnerHTML={{ __html: renderTextWithLatex(q.content_text) }} />
                      </div>
                    )}

                    {/* Question */}
                    {q.question_type !== 'text_completion' && (
                      <h3 className="text-lg font-bold text-gray-900 mb-4">
                        <span dangerouslySetInnerHTML={{ __html: renderTextWithLatex(q.question_text.replace(/\[\[([^\]]+)\]\]/g, '[[blank]]')) }} />
                      </h3>
                    )}

                    {q.question_type === 'text_completion' && (
                      <h3 className="text-lg font-bold text-gray-900 mb-4">
                        Fill in the blanks:
                      </h3>
                    )}

                    {/* Answer Input Based on Question Type - ALWAYS SHOW RESULT */}
                    {q.question_type === 'long_text' ? (
                      <LongTextQuestion
                        question={q}
                        value={userAnswer}
                        onChange={() => {}}
                        disabled={true}
                      />
                    ) : q.question_type === 'short_answer' ? (
                      <ShortAnswerQuestion
                        question={q}
                        value={userAnswer}
                        onChange={() => {}}
                        disabled={true}
                        showResult={true}
                      />
                    ) : q.question_type === 'text_completion' ? (
                      <TextCompletionQuestion
                        question={q}
                        answers={gapAnswers.get(q.id.toString()) || []}
                        onAnswerChange={() => {}}
                        disabled={true}
                        showResult={true}
                      />
                    ) : q.question_type === 'single_choice' || q.question_type === 'multiple_choice' || q.question_type === 'media_question' ? (
                      <ChoiceQuestion
                        question={q}
                        value={userAnswer}
                        onChange={() => {}}
                        disabled={true}
                        showResult={true}
                      />
                    ) : (
                      <FillInBlankQuestion
                        question={q}
                        answers={gapAnswers.get(q.id.toString()) || []}
                        onAnswerChange={() => {}}
                        disabled={true}
                        showResult={true}
                      />
                    )}

                    {/* Result Indicator */}
                    {(() => {
                      let isCorrect = false;
                      if (q.question_type === 'fill_blank') {
                        const answers: string[] = Array.isArray(q.correct_answer) ? q.correct_answer : (q.correct_answer ? [q.correct_answer] : []);
                        const current = gapAnswers.get(q.id.toString()) || new Array(answers.length).fill('');
                        isCorrect = current.every((val, idx) => (val || '').toString().trim().toLowerCase() === (answers[idx] || '').toString().trim().toLowerCase());
                      } else {
                        isCorrect = userAnswer === q.correct_answer;
                      }
                      return isCorrect ? (
                        <div className="mt-4 flex items-center gap-2">
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Correct!
                          </span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center pt-6 pb-10">
            <Button
              onClick={() => setShowAllAnswers(false)}
              className="px-8 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            >
              Back to Results
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto text-center space-y-6 p-6">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900">
          Quiz Complete!
        </h1>

        {/* Results Card */}
        <div className={`p-8 rounded-2xl border ${isPassed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
          <div className="space-y-6">
            {/* Score Display */}
            <div className="space-y-2">
              <div className={`text-6xl font-bold ${isPassed ? 'text-green-600' : 'text-red-600'
                }`}>
                {percentage}%
              </div>
              <p className={`text-lg font-medium ${isPassed ? 'text-green-800' : 'text-red-800'
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
              <div className={`rounded-lg p-3 border ${isPassed ? 'bg-white/50 border-green-200' : 'bg-white/50 border-red-200'
                }`}>
                <div className={`text-2xl font-bold ${isPassed ? 'text-green-600' : 'text-red-600'
                  }`}>{correctItems}</div>
                <div className={`text-sm font-medium ${isPassed ? 'text-green-800' : 'text-red-800'
                  }`}>Correct</div>
              </div>
              <div className={`rounded-lg p-3 border ${isPassed ? 'bg-white/50 border-green-200' : 'bg-white/50 border-red-200'
                }`}>
                <div className={`text-2xl font-bold ${isPassed ? 'text-green-600' : 'text-red-600'
                  }`}>{totalItems - correctItems}</div>
                <div className={`text-sm font-medium ${isPassed ? 'text-green-800' : 'text-red-800'
                  }`}>Incorrect</div>
              </div>
              <div className={`rounded-lg p-3 border ${isPassed ? 'bg-white/50 border-green-200' : 'bg-white/50 border-red-200'
                }`}>
                <div className={`text-2xl font-bold ${isPassed ? 'text-green-600' : 'text-red-600'
                  }`}>{totalItems}</div>
                <div className={`text-sm font-medium ${isPassed ? 'text-green-800' : 'text-red-800'
                  }`}>Total</div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        {quizAttempt && quizAttempt.feedback && (
          <div className="max-w-2xl mx-auto mt-6 p-6 bg-blue-50 border border-blue-200 rounded-xl text-left">
            <h3 className="text-lg font-bold text-blue-900 mb-2">Teacher Feedback</h3>
            <div className="text-blue-800 prose max-w-none">
              <p>{quizAttempt.feedback}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 flex-wrap">
          {quizData?.display_mode === 'all_at_once' && (
            <Button
              onClick={reviewQuiz}
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
            >
              Review Answers
            </Button>
          )}

          {isPassed && (
            <Button
              onClick={() => setShowAllAnswers(true)}
              className="bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              Show Correct Answers
            </Button>
          )}

          {!hasLongText && (
            <Button
              onClick={resetQuiz}
              variant="ghost"
              className="text-gray-500 border hover:text-gray-700 hover:bg-gray-100"
            >
              Retake Quiz
            </Button>
          )}
        </div>
      </div>
    );
  };

  switch (quizState) {
    case 'feed':
      return renderQuizFeed();
    case 'title':
      return renderQuizTitleScreen();
    case 'question':
      return renderQuizQuestion();
    case 'result':
      return renderQuizResult();
    case 'completed':
      return renderQuizCompleted();
    default:
      return null;
  }
};

export default QuizRenderer;
