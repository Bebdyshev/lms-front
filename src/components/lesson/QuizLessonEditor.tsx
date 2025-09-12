import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Question } from '../../types';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import apiClient from '../../services/api';
import { Textarea } from '../ui/textarea';
import { renderTextWithLatex } from '../../utils/latex';

export interface QuizLessonEditorProps {
  quizTitle: string;
  setQuizTitle: (title: string) => void;
  quizQuestions: Question[];
  setQuizQuestions: (questions: Question[]) => void;
  quizTimeLimit?: number;
  setQuizTimeLimit: (limit: number | undefined) => void;
}

export default function QuizLessonEditor({
  quizTitle,
  setQuizTitle,
  quizQuestions,
  setQuizQuestions,
  quizTimeLimit,
  setQuizTimeLimit,
}: QuizLessonEditorProps) {
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [draftQuestion, setDraftQuestion] = useState<Question | null>(null);
  const [showSatImageModal, setShowSatImageModal] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [satAnalysisResult, setSatAnalysisResult] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const openAddQuestion = () => {
    const ts = Date.now().toString();
    const base: Question = {
      id: ts,
      assignment_id: '',
      question_text: '',
      question_type: 'single_choice',
      options: [
        { id: ts + '_1', text: '', is_correct: false, letter: 'A' },
        { id: ts + '_2', text: '', is_correct: false, letter: 'B' },
        { id: ts + '_3', text: '', is_correct: false, letter: 'C' },
        { id: ts + '_4', text: '', is_correct: false, letter: 'D' },
      ],
      // default to first option for single choice
      correct_answer: 0,
      points: 10,
      order_index: quizQuestions.length,
      is_sat_question: true,
      content_text: ''
    };
    setDraftQuestion(base);
    setShowQuestionModal(true);
  };

  const applyDraftUpdate = (patch: Partial<Question>) => {
    if (!draftQuestion) return;
    setDraftQuestion({ ...draftQuestion, ...patch });
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updatedQuestions = [...quizQuestions];
    const question = updatedQuestions[index];

    updatedQuestions[index] = { ...question, [field]: value };
    setQuizQuestions(updatedQuestions);
  };

  const updateCorrectAnswer = (questionIndex: number, optionIndex: number, isCorrect: boolean) => {
    const updatedQuestions = [...quizQuestions];
    const question = updatedQuestions[questionIndex];

    if (question.question_type === 'single_choice') {
      if (isCorrect) question.correct_answer = optionIndex;
    } else if (question.question_type === 'multiple_choice') {
      const current = Array.isArray(question.correct_answer) ? [...question.correct_answer] : [];
      const exists = current.includes(optionIndex);
      const next = isCorrect
        ? (exists ? current : [...current, optionIndex])
        : current.filter((i) => i !== optionIndex);
      question.correct_answer = next;
    }

    setQuizQuestions(updatedQuestions);
  };

  const isOptionCorrect = (question: Question, optionIndex: number): boolean => {
    if (question.question_type === 'single_choice') {
      return question.correct_answer === optionIndex;
    }
    return Array.isArray(question.correct_answer) && question.correct_answer.includes(optionIndex);
  };

  const validateQuestion = (question: Question): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Only validate if the question has been started (has some content)
    const hasStarted = question.question_text.trim() || 
                      (question.options && question.options.some(opt => opt.text.trim())) ||
                      (question.correct_answer && (typeof question.correct_answer === 'string' ? question.correct_answer.trim() : Array.isArray(question.correct_answer) ? question.correct_answer.length > 0 : true));
    
    if (!hasStarted) {
      return { isValid: true, errors: [] }; // Don't show errors for empty questions
    }
    
    if (!question.question_text.trim()) {
      errors.push('Question text is required');
    }
    if (question.is_sat_question && !((question.content_text || '').toString().trim())) {
      errors.push('Passage text is required');
    }
    if (question.question_type === 'fill_blank') {
      const answers = Array.isArray(question.correct_answer)
        ? question.correct_answer
        : (typeof question.correct_answer === 'string' && question.correct_answer.trim())
          ? [question.correct_answer.trim()]
          : [];
      if (answers.length === 0) {
        errors.push('Please add at least one gap [[answer]] in the passage');
      }
    } else {
      const hasOptionContent = question.options?.some(opt => opt.text.trim());
      if (hasOptionContent && (typeof question.correct_answer !== 'number' || question.correct_answer < 0)) {
        errors.push('Please select a correct answer');
      }
      if (!question.options || question.options.length !== 4) {
        errors.push('Exactly 4 options are required');
      }
      if (hasOptionContent && question.options?.some(opt => !opt.text.trim())) {
        errors.push('All options must have text');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  };

  const getQuestionValidationStatus = (question: Question) => {
    return validateQuestion(question);
  };

  const removeQuestion = (index: number) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
  };

  // Fixed 4 options model - no add/remove

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...quizQuestions];
    const question = updatedQuestions[questionIndex];
    if (question.options) {
      question.options[optionIndex] = {
        ...question.options[optionIndex],
        text: value
      };
      
      // Don't change correct answers when updating option text
      // The correct answer logic now works with indices, not text
      
      setQuizQuestions(updatedQuestions);
    }
  };

  const updateDraftOptionText = (idx: number, text: string) => {
    if (!draftQuestion || !draftQuestion.options) return;
    const options = [...draftQuestion.options];
    options[idx] = { ...options[idx], text };
    applyDraftUpdate({ options });
  };

  const addDraftOption = () => {
    if (!draftQuestion) return;
    const options = draftQuestion.options ? [...draftQuestion.options] : [];
    options.push({ id: Date.now().toString(), text: '', is_correct: false });
    applyDraftUpdate({ options });
  };

  const removeDraftOption = (idx: number) => {
    if (!draftQuestion || !draftQuestion.options) return;
    const options = draftQuestion.options.filter((_, i) => i !== idx);
    // Adjust correct_answer indices if needed
    let correct = draftQuestion.correct_answer;
    if (draftQuestion.question_type === 'single_choice' && typeof correct === 'number') {
      if (correct === idx) correct = 0;
      else if (correct > idx) correct = correct - 1;
    } else if (draftQuestion.question_type === 'multiple_choice' && Array.isArray(correct)) {
      correct = correct.filter((i) => i !== idx).map((i) => (i > idx ? i - 1 : i));
      if (correct.length === 0) correct = [0];
    }
    applyDraftUpdate({ options, correct_answer: correct });
  };

  const setDraftCorrect = (idx: number, checked: boolean) => {
    if (!draftQuestion) return;
    if (draftQuestion.question_type === 'single_choice') {
      if (checked) applyDraftUpdate({ correct_answer: idx });
    } else if (draftQuestion.question_type === 'multiple_choice') {
      const current = Array.isArray(draftQuestion.correct_answer)
        ? [...draftQuestion.correct_answer]
        : [];
      const next = checked ? Array.from(new Set([...current, idx])) : current.filter((i) => i !== idx);
      applyDraftUpdate({ correct_answer: next });
    }
  };

  const saveDraftQuestion = () => {
    if (!draftQuestion) return;
    let correctAnswer: any = draftQuestion.correct_answer;
    if (draftQuestion.question_type === 'fill_blank') {
      // Extract answers from [[correct, wrong1, wrong2]] in content_text; take first as correct
      const text = (draftQuestion.content_text || '').toString();
      const gaps = Array.from(text.matchAll(/\[\[(.*?)\]\]/g));
      const corrects = gaps
        .map(m => (m[1] || ''))
        .map(inner => inner.split(',').map(s => s.trim()).filter(Boolean))
        .map(tokens => tokens[0])
        .filter(Boolean);
      correctAnswer = corrects;
    }
    const toSave: Question = {
      ...draftQuestion,
      correct_answer: correctAnswer,
      order_index: quizQuestions.length,
    };
    setQuizQuestions([...quizQuestions, toSave]);
    setShowQuestionModal(false);
    setDraftQuestion(null);
  };

  const analyzeImageFile = React.useCallback(async (file: File) => {
    setIsAnalyzingImage(true);
    try {
      const result = await apiClient.analyzeSatImage(file);
      console.log('SAT analysis result:', result);

      if (!result || result.success === false) {
        const message = (result && (result.explanation || result.error)) || 'Analysis returned no data';
        alert(`Failed to analyze image. ${message}`);
        return;
      }

      setSatAnalysisResult(result);
      
      // Convert SAT format to our Question format
      const optionsArray = Array.isArray(result.options) ? result.options : [];
      const correctIndex = optionsArray.findIndex((opt: any) => opt.letter === result.correct_answer);

      const satQuestion: Question = {
        id: Date.now().toString(),
        assignment_id: '',
        question_text: result.question_text || '',
        question_type: 'single_choice',
        options: optionsArray.map((opt: any, index: number) => ({
          id: Date.now().toString() + '_' + index,
          text: opt.text || '',
          is_correct: opt.letter === result.correct_answer,
          letter: opt.letter
        })) || [],
        correct_answer: correctIndex >= 0 ? correctIndex : 0,
        points: 10,
        order_index: quizQuestions.length,
        explanation: result.explanation || '',
        original_image_url: result.image_url,
        is_sat_question: true,
        content_text: result.content_text || ''
      };
      
      setDraftQuestion(satQuestion);
      setShowSatImageModal(false);
      setShowQuestionModal(true);
    } catch (error) {
      console.error('Error analyzing SAT image:', error);
      alert('Failed to analyze image. Please try again.');
    } finally {
      setIsAnalyzingImage(false);
    }
  }, [quizQuestions.length]);

  const handleSatImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await analyzeImageFile(file);
  };

  // Global paste handler for the entire component
  React.useEffect(() => {
    const handleGlobalPaste = async (event: ClipboardEvent) => {
      // Only handle paste if SAT modal is open
      if (!showSatImageModal) return;
      
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            await analyzeImageFile(file);
            break;
          }
        }
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => {
      document.removeEventListener('paste', handleGlobalPaste);
    };
  }, [showSatImageModal, analyzeImageFile]);

  return (
    <div className="space-y-6 p-1">
      {/* Quiz Basic Info */}
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
          <Input
            id="max-score"
            type="number"
            value={quizQuestions.length}
            onChange={(e) => {
              // This should probably be calculated automatically, not set manually
              // For now, just ignore the input
            }}
            min="1"
            placeholder="Auto-calculated"
            disabled
          />
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

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">{previewMode ? 'Preview' : 'Questions'}</h3>
          <div className="flex gap-2">
            {!previewMode ? (
              <>
                <Button onClick={() => setPreviewMode(true)} variant="outline">Preview</Button>
                <Button onClick={() => setShowSatImageModal(true)} variant="outline">Analyze SAT Image</Button>
                <Button onClick={openAddQuestion} variant="default">Add Question</Button>
              </>
            ) : (
              <Button onClick={() => setPreviewMode(false)} variant="outline">Back to editor</Button>
            )}
          </div>
        </div>

        {!previewMode ? (
          <div className="space-y-4">
            {quizQuestions.map((question, questionIndex) => {
              const validation = getQuestionValidationStatus(question);
              return (
              <Card key={question.id} className={validation.isValid ? '' : 'border-red-200'}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">Question {questionIndex + 1}</CardTitle>
                      {!validation.isValid && (
                        <div className="text-sm text-red-600">
                          {validation.errors.join(', ')}
                        </div>
                      )}
                    </div>
                    <Button 
                      onClick={() => removeQuestion(questionIndex)} 
                      variant="destructive" 
                      size="sm"
                    >
                      Remove
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
                    <Label>Question Type</Label>
                    <Select
                      value={question.question_type}
                      onValueChange={(val) => {
                        const q = { ...question } as any;
                        if (val === 'single_choice') {
                          const firstCorrect = typeof q.correct_answer === 'number' ? q.correct_answer : 0;
                          q.question_type = 'single_choice';
                          q.correct_answer = firstCorrect;
                        } else if (val === 'fill_blank') {
                          q.question_type = 'fill_blank';
                          q.correct_answer = '';
                        }
                        updateQuestion(questionIndex, 'question_type', q.question_type);
                        updateQuestion(questionIndex, 'correct_answer' as any, q.correct_answer);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select question type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_choice">Single choice</SelectItem>
                        <SelectItem value="fill_blank">Fill in the blank</SelectItem>
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

                {question.is_sat_question && question.explanation && (
                  <div className="space-y-2">
                    <Label>Explanation</Label>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="text-sm text-blue-800" dangerouslySetInnerHTML={{ __html: renderTextWithLatex(question.explanation) }} />
                    </div>
                  </div>
                )}

                {question.is_sat_question && question.content_text && (
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <div className="text-sm text-gray-800 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: renderTextWithLatex(question.content_text) }} />
                    </div>
                  </div>
                )}

                {question.question_type !== 'fill_blank' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Options (4)</Label>
                    </div>
                    <div className="space-y-2">
                      {question.options?.slice(0,4).map((option, optionIndex) => (
                        <div key={optionIndex} className={`flex items-center gap-2 p-3 rounded-md border-2 transition-colors ${
                          isOptionCorrect(question, optionIndex) 
                            ? 'bg-green-50 border-green-300 shadow-sm' 
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}>
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${questionIndex}`}
                              checked={isOptionCorrect(question, optionIndex)}
                              onChange={() => updateCorrectAnswer(questionIndex, optionIndex, true)}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                          </div>
                          {question.is_sat_question && option.letter && (
                            <span className="font-bold text-blue-600 w-6 text-center">{option.letter}.</span>
                          )}
                          <div className="flex-1 flex flex-col gap-2">
                            <Input
                              type="text"
                              value={option.text}
                              onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                              placeholder={`Option ${optionIndex + 1}`}
                            />
                            {option.text.trim() && (
                              <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded border">
                                Preview: <span dangerouslySetInnerHTML={{ __html: renderTextWithLatex(option.text) }} />
                              </div>
                            )}
                          </div>
                          {isOptionCorrect(question, optionIndex) && (
                            <span className="text-xs text-green-700 font-medium px-2 py-1 bg-green-200 rounded-full">
                              ✓ Correct
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Detected gaps</Label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                      {(() => {
                        const matches = Array.from(((question.content_text || '').toString().matchAll(/\[\[(.*?)\]\]/g)));
                        if (matches.length === 0) {
                          return <span>No gaps found. Add [[answers]] in the passage above.</span>;
                        }
                        return (
                          <div className="space-y-1">
                            {matches.map((m, i) => {
                              const tokens = (m[1]||'').split(',').map(s => s.trim()).filter(Boolean);
                              const correct = tokens[0];
                              const distractors = tokens.slice(1);
                              return (
                                <div key={i}>#{i+1}: <b>{correct}</b>{distractors.length ? ` (others: ${distractors.join(', ')})` : ''}</div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
                
                </CardContent>
              </Card>
            );
            })}
          </div>
        ) : (
          <div className="space-y-8">
            {quizQuestions.map((q, idx) => (
              <div key={q.id} className="p-4 rounded-lg border bg-white space-y-4">
                <div className="text-sm text-gray-500">Question {idx + 1}</div>
                {!!q.content_text && (
                  <div className="bg-gray-50 p-3 rounded border">
                    <div className="text-gray-800" dangerouslySetInnerHTML={{ __html: renderTextWithLatex(q.content_text) }} />
                  </div>
                )}
                <div className="text-base font-semibold text-gray-900">
                  <span dangerouslySetInnerHTML={{ __html: renderTextWithLatex(q.question_text) }} />
                </div>
                {q.question_type !== 'fill_blank' ? (
                  <div className="space-y-2">
                    {q.options?.slice(0,4).map((opt, oi) => (
                      <label key={opt.id || oi} className="flex items-center gap-2 p-3 rounded-md border bg-gray-50">
                        <input type="radio" disabled className="text-blue-600" />
                        <span dangerouslySetInnerHTML={{ __html: renderTextWithLatex(opt.text) }} />
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-md border bg-gray-50">
                    {(() => {
                      const text = (q.content_text || q.question_text || '').toString();
                      const parts = text.split(/\[\[(.*?)\]\]/g);
                      let gapIndex = 0;
                      return (
                        <div className="flex flex-wrap items-center gap-2 text-gray-800">
                          {parts.map((part, i) => {
                            const isGap = i % 2 === 1;
                            if (!isGap) {
                              return <span key={i} dangerouslySetInnerHTML={{ __html: renderTextWithLatex(part) }} />;
                            }
                            const inner = (part || '').split(',').map(s => s.trim()).filter(Boolean);
                            const options = inner;
                            const idxGap = gapIndex++;
                            return (
                              <select key={`prev-gap-${i}`} className="px-2 py-1 border rounded bg-white" defaultValue="">
                                <option value="" disabled>{`#${idxGap+1}`}</option>
                                {options.map((o, oi) => (
                                  <option key={oi} value={o}>{o}</option>
                                ))}
                              </select>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {quizQuestions.length === 0 && (
          <Card>
            <CardContent className="text-center py-8 text-gray-500">
              <p>No questions added yet. Click "Add Question" to get started.</p>
            </CardContent>
          </Card>
        )}

      </div>

      {showQuestionModal && draftQuestion && createPortal(
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-[1001] flex items-center justify-center min-h-screen">
            <div 
              className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-xl"
              onKeyDown={(e) => e.stopPropagation()}
              onKeyUp={(e) => e.stopPropagation()}
              onKeyPress={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Add Question</h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Question Text</Label>
                    <div className="space-y-2">
                      <Input
                        value={draftQuestion.question_text}
                        onChange={(e) => applyDraftUpdate({ question_text: e.target.value })}
                        autoFocus
                        placeholder="Enter your question"
                      />
                      {draftQuestion.question_text.trim() && (
                        <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded border">
                          Preview: <span dangerouslySetInnerHTML={{ __html: renderTextWithLatex(draftQuestion.question_text) }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Points</Label>
                    <Input
                      type="number"
                      value={draftQuestion.points}
                      onChange={(e) => applyDraftUpdate({ points: parseInt(e.target.value) || 0 })}
                      min={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Question Type</Label>
                    <Select
                      value={draftQuestion.question_type}
                      onValueChange={(val) => {
                        const next: any = { ...draftQuestion };
                        if (val === 'single_choice') {
                          next.question_type = 'single_choice';
                          next.correct_answer = typeof draftQuestion.correct_answer === 'number' ? draftQuestion.correct_answer : 0;
                        } else if (val === 'fill_blank') {
                          next.question_type = 'fill_blank';
                          next.correct_answer = typeof draftQuestion.correct_answer === 'string' ? draftQuestion.correct_answer : '';
                        }
                        setDraftQuestion(next);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select question type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_choice">Single choice</SelectItem>
                        <SelectItem value="fill_blank">Fill in the blank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {draftQuestion.is_sat_question && (
                    <div className="space-y-2">
                      <Label>Explanation</Label>
                      <div className="space-y-2">
                        <Input
                          value={draftQuestion.explanation || ''}
                          onChange={(e) => applyDraftUpdate({ explanation: e.target.value })}
                          placeholder="Explanation for the correct answer"
                        />
                        {(draftQuestion.explanation || '').trim() && (
                          <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded border">
                            Preview: <span dangerouslySetInnerHTML={{ __html: renderTextWithLatex(draftQuestion.explanation || '') }} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {draftQuestion.is_sat_question && (
                  <div className="space-y-2">
                    <Label>Passage:</Label>
                    <div className="space-y-2">
                      <Textarea
                        value={draftQuestion.content_text || ''}
                        onChange={(e) => applyDraftUpdate({ content_text: e.target.value })}
                        placeholder="Enter passage. Use [[answer]] to mark gaps, e.g. 'The sky is [[blue]]'."
                        className="w-full p-2 border border-gray-300 rounded-md min-h-[120px] resize-y"
                      />
                      {(draftQuestion.content_text || '').trim() && (
                        <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded border max-h-32 overflow-y-auto">
                          Preview: <span dangerouslySetInnerHTML={{ __html: renderTextWithLatex((draftQuestion.content_text || '').replace(/\[\[(.*?)\]\]/g, '<b>[$1]</b>')) }} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {draftQuestion.question_type !== 'fill_blank' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Options (4)</Label>
                  </div>
                  <div className="space-y-2">
                    {(draftQuestion.options || []).slice(0,4).map((opt, idx) => (
                      <div key={opt.id} className="p-2 border rounded-md bg-white space-y-2">
                        <div className="flex items-center gap-2">
                          {draftQuestion.question_type === 'multiple_choice' ? (
                            <input
                              type="checkbox"
                              checked={Array.isArray(draftQuestion.correct_answer) && draftQuestion.correct_answer.includes(idx)}
                              onChange={(e) => setDraftCorrect(idx, e.target.checked)}
                            />
                          ) : (
                            <input
                              type="radio"
                              name="draft-correct"
                              checked={draftQuestion.correct_answer === idx}
                              onChange={() => setDraftCorrect(idx, true)}
                            />
                          )}
                          <Input
                            value={opt.text}
                            onChange={(e) => updateDraftOptionText(idx, e.target.value)}
                            placeholder={`Option ${idx + 1}`}
                            className="flex-1"
                          />
                        </div>
                        {opt.text.trim() && (
                          <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded border ml-6">
                            Preview: <span dangerouslySetInnerHTML={{ __html: renderTextWithLatex(opt.text) }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Gaps preview</Label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
                    {(() => {
                      const text = (draftQuestion.content_text || '').toString();
                      const gaps = Array.from(text.matchAll(/\[\[(.*?)\]\]/g));
                      if (gaps.length === 0) return <span>No gaps yet. Add [[correct, wrong1, wrong2]] in the passage field.</span>;
                      return (
                        <div className="space-y-1">
                          {gaps.map((m, i) => {
                            const tokens = (m[1]||'').split(',').map(s => s.trim()).filter(Boolean);
                            const correct = tokens[0];
                            const distractors = tokens.slice(1);
                            return (
                              <div key={i}>#{i+1}: <b>{correct}</b>{distractors.length ? ` (others: ${distractors.join(', ')})` : ''}</div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setShowQuestionModal(false); setDraftQuestion(null); }}>Cancel</Button>
                <Button onClick={saveDraftQuestion} className="bg-blue-600 hover:bg-blue-700">Save Question</Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* SAT Image Analysis Modal */}
      {showSatImageModal && createPortal(
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-[1001] flex items-center justify-center min-h-screen">
            <div 
              className="bg-white rounded-lg w-full max-w-md p-6 space-y-4 shadow-xl"
              tabIndex={0}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Import SAT Image</h3>
                <Button variant="outline" onClick={() => setShowSatImageModal(false)}>Close</Button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Upload an image of a SAT question to automatically extract the question text, options, and correct answer.
                </p>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSatImageUpload}
                    className="hidden"
                    id="sat-image-upload"
                    disabled={isAnalyzingImage}
                  />
                  <label htmlFor="sat-image-upload" className="cursor-pointer">
                    <div className="space-y-2">
                      <div className="text-4xl">📷</div>
                      <div className="text-sm font-medium">
                        {isAnalyzingImage ? 'Analyzing...' : 'Click to upload image'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Supports JPG, PNG, GIF
                      </div>
                    </div>
                  </label>
                </div>

                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-2">or</div>
                  <div className="text-sm text-gray-600">
                    Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl+V</kbd> to paste from clipboard
                  </div>
                </div>

                {isAnalyzingImage && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Analyzing image with AI...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}


