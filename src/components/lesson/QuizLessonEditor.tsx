import React from 'react';
import type { Question } from '../../types';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      assignment_id: '',
      question_text: '',
      question_type: 'single_choice',
      options: [
        { id: Date.now().toString() + '_1', text: 'Option 1', is_correct: false },
        { id: Date.now().toString() + '_2', text: 'Option 2', is_correct: false },
        { id: Date.now().toString() + '_3', text: 'Option 3', is_correct: false },
        { id: Date.now().toString() + '_4', text: 'Option 4', is_correct: false }
      ],
      correct_answer: 0, // First option is correct by default for single choice
      points: 10,
      order_index: quizQuestions.length
    };
    console.log('Adding new question:', newQuestion);
    setQuizQuestions([...quizQuestions, newQuestion]);
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

  return (
    <div className="space-y-6">
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
          <div className="flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
            <span className="text-gray-700">{quizQuestions.length} points</span>
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

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Questions</h3>
          <Button onClick={addQuestion} variant="default">
            Add Question
          </Button>
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
    </div>
  );
}


