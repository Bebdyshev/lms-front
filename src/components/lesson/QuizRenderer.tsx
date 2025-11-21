import { Button } from '../ui/button';
import { CheckCircle, ChevronRight, HelpCircle } from 'lucide-react';
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
  getScore: () => number;
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
    getScore,
    isCurrentAnswerCorrect,
    getCurrentQuestion,
    getCurrentUserAnswer,
    goToNextStep,
    setQuizCompleted,
    markStepAsVisited,
    currentStep,
    saveQuizAttempt,
    setFeedChecked,
    getGapStatistics,
    setQuizAnswers,
    steps,
    goToStep,
    currentStepIndex,
    nextLessonId,
    courseId,
    finishQuiz,
    reviewQuiz,
  } = props;

  const navigate = useNavigate();

  // All render functions will be moved here from LessonPage.tsx
  // For now, this is a placeholder.
  // The actual implementation will be added in the next steps.

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
                  {q.content_text && q.question_type !== 'text_completion' && q.question_type !== 'fill_blank' && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-4 border-l-3 border-blue-400">
                      <div className="text-gray-700" dangerouslySetInnerHTML={{ __html: renderTextWithLatex(q.content_text) }} />
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
                       isCorrect = current.every((val, idx) => (val||'').toString().trim().toLowerCase() === (answers[idx]||'').toString().trim().toLowerCase());
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
            <button
              onClick={() => {
                setFeedChecked(true);
                finishQuiz();
              }}
              disabled={questions.some(q => {
                const ans = quizAnswers.get(q.id);
                if (q.question_type === 'fill_blank') {
                  const gapAns = gapAnswers.get(q.id.toString()) || [];
                  return gapAns.length === 0 || gapAns.some(v => (v||'').toString().trim() === '');
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
                    const gapAns = gapAnswers.get(q.id.toString()) || [];
                    return gapAns.length === 0 || gapAns.some(v => (v||'').toString().trim() === '');
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
    if (!questions || questions.length === 0) return null;
    const q = questions[currentQuestionIndex];
    if (!q) return null;

    const userAnswer = quizAnswers.get(q.id);

    return (
      <div className="max-w-3xl mx-auto space-y-6 p-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Quiz Question</h2>
          <p className="text-gray-600">Question {currentQuestionIndex + 1} of {questions.length}</p>
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

        <div className="bg-white border border-gray-200 rounded-xl shadow-md">
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
            {q.content_text && q.question_type !== 'text_completion' && q.question_type !== 'fill_blank' && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4 border-l-3 border-blue-400">
                <div className="text-gray-700" dangerouslySetInnerHTML={{ __html: renderTextWithLatex(q.content_text) }} />
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
            <button
              onClick={checkAnswer}
              disabled={(() => {
                const ans = quizAnswers.get(q.id);
                if (q.question_type === 'fill_blank') {
                  const gapAns = gapAnswers.get(q.id.toString()) || [];
                  return gapAns.length === 0 || gapAns.some(v => (v||'').toString().trim() === '');
                }
                if (q.question_type === 'text_completion') {
                  const gapAns = gapAnswers.get(q.id.toString()) || [];
                  return gapAns.length === 0 || gapAns.some(v => (v||'').toString().trim() === '');
                }
                if (q.question_type === 'short_answer' || q.question_type === 'long_text') {
                  return !ans || (ans || '').toString().trim() === '';
                }
                return ans === undefined;
              })()}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Check Answer
            </button>
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
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center justify-center space-x-3">
            {/* Result Icon */}
            {isCorrect && (
              <>
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-500">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                
                {/* Result Text */}
                <div>
                  <h2 className="text-xl font-bold text-green-800">
                    Correct!
                  </h2>
                </div>
              </>
            )}
            
            {!isCorrect && (
              <div>
                <h2 className="text-xl font-bold text-blue-800">
                  Review your answer
                </h2>
              </div>
            )}
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
                  
                  if (question.question_type === 'fill_blank') {
                    return (
                      <FillInBlankQuestion
                        question={question}
                        answers={current}
                        onAnswerChange={() => {}}
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
          {quizData?.display_mode === 'all_at_once' && (
            <button
              onClick={reviewQuiz}
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400 px-6 py-3 rounded-lg text-base font-semibold shadow-sm hover:shadow-md transition-all duration-200"
            >
              Review Answers
            </button>
          )}

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
