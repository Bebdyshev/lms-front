import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Question } from '../../types';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import apiClient from '../../services/api';
import { Textarea } from '../ui/textarea';

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

  const openAddQuestion = () => {
    const ts = Date.now().toString();
    const base: Question = {
      id: ts,
      assignment_id: '',
      question_text: '',
      question_type: 'single_choice',
      options: [
        { id: ts + '_1', text: 'Option 1', is_correct: false },
        { id: ts + '_2', text: 'Option 2', is_correct: false },
      ],
      correct_answer: 0,
      points: 10,
      order_index: quizQuestions.length,
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
    
    // If changing question type, reset correct answer
    if (field === 'question_type') {
      if (value === 'single_choice') {
        question.correct_answer = 0; // First option is correct by default
      } else if (value === 'multiple_choice') {
        question.correct_answer = [0]; // First option is correct by default
      } else if (value === 'fill_blank') {
        question.correct_answer = '';
      }
    }
    
    updatedQuestions[index] = { ...question, [field]: value };
    setQuizQuestions(updatedQuestions);
  };

  const updateCorrectAnswer = (questionIndex: number, optionIndex: number, isCorrect: boolean) => {
    const updatedQuestions = [...quizQuestions];
    const question = updatedQuestions[questionIndex];
    
    console.log('updateCorrectAnswer called:', { questionIndex, optionIndex, isCorrect, questionType: question.question_type });
    
    if (question.question_type === 'single_choice') {
      // For single choice, set the selected option as correct
      if (isCorrect) {
        question.correct_answer = optionIndex;
      } else {
        // If deselecting, keep the current answer (don't allow no correct answer)
        console.log('Single choice - keeping current answer');
      }
      console.log('Single choice - setting correct answer to index:', question.correct_answer);
    } else if (question.question_type === 'multiple_choice') {
      // For multiple choice, toggle the option in the array
      const currentAnswers = Array.isArray(question.correct_answer) ? question.correct_answer : [];
      
      if (isCorrect) {
        // Add to correct answers if not already there
        if (!currentAnswers.includes(optionIndex)) {
          question.correct_answer = [...currentAnswers, optionIndex];
        }
      } else {
        // Remove from correct answers
        question.correct_answer = currentAnswers.filter(answer => answer !== optionIndex);
      }
      console.log('Multiple choice - correct answers:', question.correct_answer);
    }
    
    console.log('Updated question correct answer:', question.correct_answer);
    setQuizQuestions(updatedQuestions);
  };

  const isOptionCorrect = (question: Question, optionIndex: number): boolean => {
    if (question.question_type === 'single_choice') {
      const isCorrect = question.correct_answer === optionIndex;
      console.log('Single choice check:', { optionIndex, correctAnswer: question.correct_answer, isCorrect });
      return isCorrect;
    } else if (question.question_type === 'multiple_choice') {
      const isCorrect = Array.isArray(question.correct_answer) && question.correct_answer.includes(optionIndex);
      console.log('Multiple choice check:', { optionIndex, correctAnswers: question.correct_answer, isCorrect });
      return isCorrect;
    }
    return false;
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
    
    if (question.question_type === 'single_choice') {
      const hasOptionContent = question.options?.some(opt => opt.text.trim());
      // Only validate correct answer if options have been filled
      if (hasOptionContent && (typeof question.correct_answer !== 'number' || question.correct_answer < 0)) {
        errors.push('Please select a correct answer');
      }
      if (!question.options || question.options.length < 2) {
        errors.push('At least 2 options are required');
      }
      // Only validate options if at least one option has been filled
      if (hasOptionContent && question.options?.some(opt => !opt.text.trim())) {
        errors.push('All options must have text');
      }
    } else if (question.question_type === 'multiple_choice') {
      const hasOptionContent = question.options?.some(opt => opt.text.trim());
      // Only validate correct answer if options have been filled
      if (hasOptionContent && (!Array.isArray(question.correct_answer) || question.correct_answer.length === 0)) {
        errors.push('Please select at least one correct answer');
      }
      if (!question.options || question.options.length < 2) {
        errors.push('At least 2 options are required');
      }
      // Only validate options if at least one option has been filled
      if (hasOptionContent && question.options?.some(opt => !opt.text.trim())) {
        errors.push('All options must have text');
      }
    } else if (question.question_type === 'fill_blank') {
      if (!question.correct_answer || (typeof question.correct_answer === 'string' && !question.correct_answer.trim())) {
        errors.push('Correct answer is required');
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

  const addOption = (questionIndex: number) => {
    const updatedQuestions = [...quizQuestions];
    const question = updatedQuestions[questionIndex];
    if (question.options) {
      question.options.push({ id: Date.now().toString(), text: '', is_correct: false });
      setQuizQuestions(updatedQuestions);
    }
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...quizQuestions];
    const question = updatedQuestions[questionIndex];
    if (question.options && question.options.length > 2) {
      question.options.splice(optionIndex, 1);
      
      // Update correct answers after removing an option
      if (question.question_type === 'single_choice') {
        if (typeof question.correct_answer === 'number') {
          if (question.correct_answer === optionIndex) {
            // If we removed the correct answer, set first option as correct
            question.correct_answer = 0;
          } else if (question.correct_answer > optionIndex) {
            // If we removed an option before the correct answer, adjust the index
            question.correct_answer = question.correct_answer - 1;
          }
        }
      } else if (question.question_type === 'multiple_choice' && Array.isArray(question.correct_answer)) {
        // Remove the index from correct answers and adjust other indices
        question.correct_answer = question.correct_answer
          .filter(answer => answer !== optionIndex)
          .map(answer => answer > optionIndex ? answer - 1 : answer);
        
        // If no correct answers left, set first option as correct
        if (question.correct_answer.length === 0) {
          question.correct_answer = [0];
        }
      }
      
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
    const toSave: Question = {
      ...draftQuestion,
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
      setSatAnalysisResult(result);
      
      // Convert SAT format to our Question format
      const satQuestion: Question = {
        id: Date.now().toString(),
        assignment_id: '',
        question_text: result.question_text,
        question_type: 'single_choice',
        options: result.options?.map((opt: any, index: number) => ({
          id: Date.now().toString() + '_' + index,
          text: opt.text,
          is_correct: opt.letter === result.correct_answer,
          letter: opt.letter
        })) || [],
        correct_answer: result.options?.findIndex((opt: any) => opt.letter === result.correct_answer) || 0,
        points: 10,
        order_index: quizQuestions.length,
        explanation: result.explanation,
        original_image_url: result.image_url,
        is_sat_question: true,
        content_text: result.content_text
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
          <h3 className="text-lg font-medium text-gray-900">Questions</h3>
          <div className="flex gap-2">
            <Button onClick={() => setShowSatImageModal(true)} variant="outline">
              Analyze SAT Image
            </Button>
            <Button onClick={openAddQuestion} variant="default">
              Add Question
            </Button>
          </div>
        </div>

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
                    <Label htmlFor={`question-type-${questionIndex}`}>Question Type</Label>
                    <Select
                      value={question.question_type}
                      onValueChange={(value) => updateQuestion(questionIndex, 'question_type', value)}
                    >
                      <SelectTrigger id={`question-type-${questionIndex}`}>
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

                {question.is_sat_question && question.explanation && (
                  <div className="space-y-2">
                    <Label>Explanation</Label>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">{question.explanation}</p>
                    </div>
                  </div>
                )}

                {question.is_sat_question && question.content_text && (
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{question.content_text}</p>
                    </div>
                  </div>
                )}

                {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Options</Label>
                      <Button 
                        onClick={() => addOption(questionIndex)} 
                        variant="outline" 
                        size="sm"
                      >
                        Add Option
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {question.options?.map((option, optionIndex) => (
                        <div key={optionIndex} className={`flex items-center gap-2 p-3 rounded-md border-2 transition-colors ${
                          isOptionCorrect(question, optionIndex) 
                            ? 'bg-green-50 border-green-300 shadow-sm' 
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}>
                          {question.question_type === 'single_choice' ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${questionIndex}`}
                                checked={isOptionCorrect(question, optionIndex)}
                                onChange={() => updateCorrectAnswer(questionIndex, optionIndex, true)}
                                className="text-blue-600 focus:ring-blue-500"
                              />
                            </div>
                          ) : (
                            <Checkbox
                              checked={isOptionCorrect(question, optionIndex)}
                              onCheckedChange={(checked) => updateCorrectAnswer(questionIndex, optionIndex, checked === true)}
                            />
                          )}
                          {question.is_sat_question && option.letter && (
                            <span className="font-bold text-blue-600 w-6 text-center">{option.letter}.</span>
                          )}
                          <Input
                            type="text"
                            value={option.text}
                            onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                            placeholder={`Option ${optionIndex + 1}`}
                            className="flex-1"
                          />
                          {isOptionCorrect(question, optionIndex) && (
                            <span className="text-xs text-green-700 font-medium px-2 py-1 bg-green-200 rounded-full">
                              ✓ Correct
                            </span>
                          )}
                          {question.options && question.options.length > 2 && (
                            <Button
                              onClick={() => removeOption(questionIndex, optionIndex)}
                              variant="destructive"
                              size="sm"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {question.question_type === 'fill_blank' && (
                  <div className="space-y-2">
                    <Label htmlFor={`correct-answer-${questionIndex}`}>Correct Answer</Label>
                    <Input
                      id={`correct-answer-${questionIndex}`}
                      type="text"
                      value={question.correct_answer || ''}
                      onChange={(e) => updateQuestion(questionIndex, 'correct_answer', e.target.value)}
                      placeholder="Enter the correct answer"
                    />
                  </div>
                )}
                
              </CardContent>
            </Card>
          );
          })}
        </div>

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
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Add Question</h3>
                <Button variant="outline" onClick={() => { setShowQuestionModal(false); setDraftQuestion(null); }}>Close</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Question Text</Label>
                  <Input
                    value={draftQuestion.question_text}
                    onChange={(e) => applyDraftUpdate({ question_text: e.target.value })}
                    placeholder="Enter your question"
                  />
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
                    onValueChange={(value) => {
                      // reset correct answer according to type
                      if (value === 'single_choice') applyDraftUpdate({ question_type: 'single_choice', correct_answer: 0 });
                      else if (value === 'multiple_choice') applyDraftUpdate({ question_type: 'multiple_choice', correct_answer: [0] });
                      else applyDraftUpdate({ question_type: 'fill_blank', correct_answer: '' });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_choice">Single Choice</SelectItem>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {draftQuestion.is_sat_question && (
                  <div className="space-y-2">
                    <Label>Explanation</Label>
                    <Input
                      value={draftQuestion.explanation || ''}
                      onChange={(e) => applyDraftUpdate({ explanation: e.target.value })}
                      placeholder="Explanation for the correct answer"
                    />
                  </div>
                )}

                {draftQuestion.is_sat_question && (
                  <div className="space-y-2">
                    <Label>Passage:</Label>
                    <Textarea
                      value={draftQuestion.content_text || ''}
                      onChange={(e) => applyDraftUpdate({ content_text: e.target.value })}
                      placeholder="The full content/passage that the question is based on"
                      className="w-full p-2 border border-gray-300 rounded-md min-h-[100px] resize-y"
                    />
                  </div>
                )}
              </div>

              {(draftQuestion.question_type === 'single_choice' || draftQuestion.question_type === 'multiple_choice') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Options</Label>
                    <Button variant="outline" size="sm" onClick={addDraftOption}>Add Option</Button>
                  </div>
                  <div className="space-y-2">
                    {draftQuestion.options?.map((opt, idx) => (
                      <div key={opt.id} className="flex items-center gap-2 p-2 border rounded-md bg-white">
                        {draftQuestion.question_type === 'single_choice' ? (
                          <input
                            type="radio"
                            name="draft-correct"
                            checked={draftQuestion.correct_answer === idx}
                            onChange={() => setDraftCorrect(idx, true)}
                          />
                        ) : (
                          <Checkbox
                            checked={Array.isArray(draftQuestion.correct_answer) && draftQuestion.correct_answer.includes(idx)}
                            onCheckedChange={(checked) => setDraftCorrect(idx, checked === true)}
                          />
                        )}
                        <Input
                          value={opt.text}
                          onChange={(e) => updateDraftOptionText(idx, e.target.value)}
                          placeholder={`Option ${idx + 1}`}
                          className="flex-1"
                        />
                        {draftQuestion.options && draftQuestion.options.length > 2 && (
                          <Button variant="destructive" size="sm" onClick={() => removeDraftOption(idx)}>Remove</Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {draftQuestion.question_type === 'fill_blank' && (
                <div className="space-y-2">
                  <Label>Correct Answer</Label>
                  <Input
                    value={(draftQuestion.correct_answer as string) || ''}
                    onChange={(e) => applyDraftUpdate({ correct_answer: e.target.value })}
                    placeholder="Enter the correct answer"
                  />
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


