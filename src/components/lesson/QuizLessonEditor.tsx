import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Question } from '../../types';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import apiClient from '../../services/api';
import { renderTextWithLatex } from '../../utils/latex';
import RichTextEditor from '../RichTextEditor';
import { Upload, FileText, Image } from 'lucide-react';

export interface QuizLessonEditorProps {
  quizTitle: string;
  setQuizTitle: (title: string) => void;
  quizQuestions: Question[];
  setQuizQuestions: (questions: Question[]) => void;
  quizTimeLimit?: number;
  setQuizTimeLimit: (limit: number | undefined) => void;
  quizDisplayMode?: 'one_by_one' | 'all_at_once';
  setQuizDisplayMode?: (mode: 'one_by_one' | 'all_at_once') => void;
}

export default function QuizLessonEditor({
  quizTitle,
  setQuizTitle,
  quizQuestions,
  setQuizQuestions,
  quizTimeLimit,
  setQuizTimeLimit,
  quizDisplayMode = 'one_by_one',
  setQuizDisplayMode,
}: QuizLessonEditorProps) {
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [draftQuestion, setDraftQuestion] = useState<Question | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [showSatImageModal, setShowSatImageModal] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

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
      points: 1,
      order_index: quizQuestions.length,
      is_sat_question: true,
      content_text: ''
    };
    setDraftQuestion(base);
    setEditingQuestionIndex(null);
    setShowQuestionModal(true);
  };

  const openEditQuestion = (questionIndex: number) => {
    const question = quizQuestions[questionIndex];
    setDraftQuestion({ ...question });
    setEditingQuestionIndex(questionIndex);
    setShowQuestionModal(true);
  };

  const applyDraftUpdate = (patch: Partial<Question>) => {
    if (!draftQuestion) return;
    setDraftQuestion({ ...draftQuestion, ...patch });
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
    } else if (question.question_type === 'long_text') {
      // Long text questions don't need options validation
      if (!question.correct_answer && question.correct_answer !== '') {
        // For long text, we just need some placeholder for correct_answer
      }
    } else {
      // For single_choice, multiple_choice, media_question - require options
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


  const updateDraftOptionText = (idx: number, text: string) => {
    if (!draftQuestion || !draftQuestion.options) return;
    const options = [...draftQuestion.options];
    options[idx] = { ...options[idx], text };
    applyDraftUpdate({ options });
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
      order_index: editingQuestionIndex !== null ? draftQuestion.order_index : quizQuestions.length,
    };
    
    if (editingQuestionIndex !== null) {
      // Update existing question
      const updatedQuestions = [...quizQuestions];
      updatedQuestions[editingQuestionIndex] = toSave;
      setQuizQuestions(updatedQuestions);
    } else {
      // Add new question
    setQuizQuestions([...quizQuestions, toSave]);
    }
    
    setShowQuestionModal(false);
    setDraftQuestion(null);
    setEditingQuestionIndex(null);
  };

  const uploadQuestionMedia = React.useCallback(async (file: File) => {
    setIsUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('file_type', 'question_media');

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/media/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload media');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error uploading media:', error);
      alert('Failed to upload media. Please try again.');
      return null;
    } finally {
      setIsUploadingMedia(false);
    }
  }, []);

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
        points: 1,
        order_index: quizQuestions.length,
        explanation: result.explanation || '',
        original_image_url: result.image_url,
        is_sat_question: true,
        content_text: result.content_text || ''
      };
      
      setDraftQuestion(satQuestion);
      setEditingQuestionIndex(null);
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
            onChange={() => {
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

      {setQuizDisplayMode && (
        <div className="space-y-2">
          <Label>Display Mode</Label>
          <div className="grid grid-cols-2 gap-3">
            <div 
              className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                quizDisplayMode === 'one_by_one' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setQuizDisplayMode('one_by_one')}
            >
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 rounded-full flex items-center justify-center">
                  {quizDisplayMode === 'one_by_one' && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                </div>
                <div>
                  <div className="font-medium text-sm">One by One</div>
                  <div className="text-xs text-gray-500">Show questions sequentially</div>
                </div>
              </div>
            </div>
            
            <div 
              className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                quizDisplayMode === 'all_at_once' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setQuizDisplayMode('all_at_once')}
            >
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 rounded-full flex items-center justify-center">
                  {quizDisplayMode === 'all_at_once' && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                </div>
                <div>
                  <div className="font-medium text-sm">All at Once</div>
                  <div className="text-xs text-gray-500">Show all questions together</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Questions</h3>
          <div className="flex gap-2">
                <Button onClick={() => setShowSatImageModal(true)} variant="outline">Analyze SAT Image</Button>
                <Button onClick={openAddQuestion} variant="default">Add Question</Button>
          </div>
        </div>

        <div className="space-y-8">
          {quizQuestions.map((q, idx) => {
            const validation = getQuestionValidationStatus(q);
              return (
              <div key={q.id} className={`p-4 rounded-lg border bg-white space-y-4 ${!validation.isValid ? 'border-red-200' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-500">Question {idx + 1}</div>
                      {!validation.isValid && (
                        <div className="text-sm text-red-600">
                          {validation.errors.join(', ')}
                        </div>
                      )}
                    </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => openEditQuestion(idx)} 
                      variant="outline" 
                      size="sm"
                    >
                      Edit
                    </Button>
                    <Button 
                      onClick={() => removeQuestion(idx)} 
                      variant="destructive" 
                      size="sm"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                
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
            <div 
              className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-xl"
              onKeyDown={(e) => e.stopPropagation()}
              onKeyUp={(e) => e.stopPropagation()}
              onKeyPress={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {editingQuestionIndex !== null ? 'Edit Question' : 'Add Question'}
                </h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowHelpModal(true)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Help
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left side - Passage and Explanation */}
                {draftQuestion.is_sat_question && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Content:</Label>
                      <Tabs defaultValue="passage" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="passage">Passage</TabsTrigger>
                          <TabsTrigger value="explanation">Explanation</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="passage" className="space-y-2">
                          <RichTextEditor
                            value={draftQuestion.content_text || ''}
                            onChange={(value) => applyDraftUpdate({ content_text: value })}
                            placeholder="Enter passage. Use [[answer]] to mark gaps, e.g. 'The sky is [[blue]]'."
                            className="min-h-[200px]"
                          />
                          {(draftQuestion.content_text || '').trim() && (
                            <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded border max-h-32 overflow-y-auto">
                              Preview: <span dangerouslySetInnerHTML={{ __html: renderTextWithLatex((draftQuestion.content_text || '').replace(/\[\[(.*?)\]\]/g, '<b>[$1]</b>')) }} />
                            </div>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="explanation" className="space-y-2">
                          <RichTextEditor
                            value={draftQuestion.explanation || ''}
                            onChange={(value) => applyDraftUpdate({ explanation: value })}
                            placeholder="Explanation for the correct answer (supports rich text formatting and LaTeX)"
                            className="min-h-[200px]"
                          />
                          {(draftQuestion.explanation || '').trim() && (
                            <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded border max-h-32 overflow-y-auto">
                              Preview: <span dangerouslySetInnerHTML={{ __html: renderTextWithLatex(draftQuestion.explanation || '') }} />
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                )}

                {/* Right side - Question settings and options */}
              <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question Text</Label>
                    <div className="space-y-2">
                      <Input
                        value={draftQuestion.question_text}
                        onChange={(e) => applyDraftUpdate({ question_text: e.target.value })}
                        placeholder="Enter your question"
                        autoFocus
                      />
                      {draftQuestion.question_text.trim() && (
                        <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded border">
                          Preview: <span dangerouslySetInnerHTML={{ __html: renderTextWithLatex(draftQuestion.question_text) }} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                          next.question_type = val;
                          next.correct_answer = typeof draftQuestion.correct_answer === 'number' ? draftQuestion.correct_answer : 0;
                          // Ensure options exist for single choice
                          if (!next.options || next.options.length === 0) {
                            const ts = Date.now().toString();
                            next.options = [
                              { id: ts + '_1', text: '', is_correct: false, letter: 'A' },
                              { id: ts + '_2', text: '', is_correct: false, letter: 'B' },
                              { id: ts + '_3', text: '', is_correct: false, letter: 'C' },
                              { id: ts + '_4', text: '', is_correct: false, letter: 'D' },
                            ];
                          }
                        } else if (val === 'media_question') {
                          next.question_type = val;
                          next.correct_answer = typeof draftQuestion.correct_answer === 'number' ? draftQuestion.correct_answer : 0;
                          // Ensure options exist for media question
                          if (!next.options || next.options.length === 0) {
                            const ts = Date.now().toString();
                            next.options = [
                              { id: ts + '_1', text: '', is_correct: false, letter: 'A' },
                              { id: ts + '_2', text: '', is_correct: false, letter: 'B' },
                              { id: ts + '_3', text: '', is_correct: false, letter: 'C' },
                              { id: ts + '_4', text: '', is_correct: false, letter: 'D' },
                            ];
                          }
                        } else if (val === 'fill_blank') {
                          next.question_type = 'fill_blank';
                          next.correct_answer = typeof draftQuestion.correct_answer === 'string' ? draftQuestion.correct_answer : '';
                          next.options = undefined; // Clear options for fill_blank
                        } else if (val === 'long_text') {
                          next.question_type = 'long_text';
                          next.correct_answer = '';
                          next.options = undefined; // Clear options for long_text
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
                        <SelectItem value="long_text">Long text answer</SelectItem>
                        <SelectItem value="media_question">Media-based question</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
              </div>

              {/* Media Upload for Media Questions */}
              {draftQuestion.question_type === 'media_question' && (
                <div className="space-y-2">
                  <Label>Media Attachment</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    {draftQuestion.media_url ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {draftQuestion.media_type === 'pdf' ? (
                            <FileText className="w-5 h-5 text-red-600" />
                          ) : (
                            <Image className="w-5 h-5 text-blue-600" />
                          )}
                          <span className="text-sm font-medium">Media attached</span>
                        </div>
                        {draftQuestion.media_type === 'image' && (
                          <img 
                            src={draftQuestion.media_url} 
                            alt="Question media" 
                            className="max-w-xs max-h-48 object-contain rounded"
                          />
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => applyDraftUpdate({ media_url: undefined, media_type: undefined })}
                        >
                          Remove Media
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <div className="text-sm text-gray-600 mb-2">
                          Upload PDF or image for this question
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const result = await uploadQuestionMedia(file);
                              if (result) {
                                const mediaType = file.type.startsWith('image/') ? 'image' : 'pdf';
                                applyDraftUpdate({ 
                                  media_url: result.file_url, 
                                  media_type: mediaType 
                                });
                              }
                            }
                          }}
                          className="hidden"
                          id="media-upload"
                        />
                        <label htmlFor="media-upload" className="cursor-pointer">
                          <Button variant="outline" size="sm" disabled={isUploadingMedia}>
                            {isUploadingMedia ? 'Uploading...' : 'Choose File'}
                          </Button>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Long Text Answer Configuration */}
              {draftQuestion.question_type === 'long_text' && (
                <div className="space-y-2">
                  <Label>Answer Configuration</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expected-length">Expected Length (characters)</Label>
                      <Input
                        id="expected-length"
                        type="number"
                        value={draftQuestion.expected_length || ''}
                        onChange={(e) => applyDraftUpdate({ expected_length: parseInt(e.target.value) || undefined })}
                        placeholder="e.g. 500"
                        min="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                      <Input
                        id="keywords"
                        type="text"
                        value={draftQuestion.keywords?.join(', ') || ''}
                        onChange={(e) => {
                          const keywords = e.target.value.split(',').map(k => k.trim()).filter(Boolean);
                          applyDraftUpdate({ keywords: keywords.length > 0 ? keywords : undefined });
                        }}
                        placeholder="keyword1, keyword2, keyword3"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Keywords help with automatic grading. Students' answers will be checked for these terms.
                  </div>
                </div>
              )}

              {draftQuestion.question_type !== 'fill_blank' && draftQuestion.question_type !== 'long_text' ? (
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
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setShowQuestionModal(false); setDraftQuestion(null); setEditingQuestionIndex(null); }}>Cancel</Button>
                <Button onClick={saveDraftQuestion} className="bg-blue-600 hover:bg-blue-700">
                  {editingQuestionIndex !== null ? 'Update Question' : 'Save Question'}
                </Button>
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

      {/* Help Modal */}
      {showHelpModal && createPortal(
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-[1001] flex items-center justify-center min-h-screen">
            <div 
              className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Formatting Help</h3>
                <Button variant="outline" onClick={() => setShowHelpModal(false)}>Close</Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Text Formatting in Input Fields</h4>
                  <p className="text-sm text-gray-600">
                    You can use simple markdown formatting in Question Text and Options fields:
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                      <code className="text-sm font-mono bg-white px-2 py-1 rounded border">_text_</code>
                      <span className="text-sm">→</span>
                      <em className="text-sm">italic text</em>
                    </div>
                    
                    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                      <code className="text-sm font-mono bg-white px-2 py-1 rounded border">**text**</code>
                      <span className="text-sm">→</span>
                      <strong className="text-sm">bold text</strong>
                    </div>
                    
                    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                      <code className="text-sm font-mono bg-white px-2 py-1 rounded border">__text__</code>
                      <span className="text-sm">→</span>
                      <u className="text-sm">underlined text</u>
                    </div>
                    
                    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                      <code className="text-sm font-mono bg-white px-2 py-1 rounded border">~~text~~</code>
                      <span className="text-sm">→</span>
                      <del className="text-sm">strikethrough text</del>
                    </div>
                    
                    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                      <code className="text-sm font-mono bg-white px-2 py-1 rounded border">`text`</code>
                      <span className="text-sm">→</span>
                      <code className="text-sm bg-gray-200 px-1 rounded">code text</code>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">LaTeX Formulas</h4>
                  <p className="text-sm text-gray-600">
                    For mathematical expressions, use LaTeX syntax:
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                      <code className="text-sm font-mono bg-white px-2 py-1 rounded border">$x^2$</code>
                      <span className="text-sm">→</span>
                      <span className="text-sm">x² (inline formula)</span>
                    </div>
                    
                    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                      <code className="text-sm font-mono bg-white px-2 py-1 rounded border">$$\frac{"{a}"}{"{b}"}$$</code>
                      <span className="text-sm">→</span>
                      <span className="text-sm">a/b (block formula)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Rich Text Editor</h4>
                  <p className="text-sm text-gray-600">
                    For Passage and Explanation fields, use the rich text editor with full formatting toolbar including:
                  </p>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                    <li>Bold, italic, underline, strikethrough</li>
                    <li>Colors and background colors</li>
                    <li>Lists (ordered and bullet)</li>
                    <li>Links and images</li>
                    <li>LaTeX formulas with visual editor</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Fill in the Blank Questions</h4>
                  <p className="text-sm text-gray-600">
                    For fill-in-the-blank questions, use double brackets in the passage:
                  </p>
                  <div className="p-3 bg-blue-50 rounded border">
                    <code className="text-sm font-mono">
                      The sky is [[blue, azure, cyan]] and the grass is [[green, emerald]].
                    </code>
                    <p className="text-xs text-gray-600 mt-1">
                      First option is correct, others are distractors
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}


