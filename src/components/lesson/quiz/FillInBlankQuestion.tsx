import React from 'react';
import { FillInBlankRenderer } from '../FillInBlankRenderer';

interface FillInBlankQuestionProps {
  question: any;
  answers: string[];
  onAnswerChange: (index: number, value: string) => void;
  disabled?: boolean;
  showResult?: boolean;
}

export const FillInBlankQuestion: React.FC<FillInBlankQuestionProps> = ({
  question,
  answers,
  onAnswerChange,
  disabled,
  showResult
}) => {
  const correctAnswers: string[] = Array.isArray(question.correct_answer) ? question.correct_answer : (question.correct_answer ? [question.correct_answer] : []);
  
  // Convert array to object for FillInBlankRenderer
  const answersObj: Record<number, string> = {};
  answers.forEach((val, idx) => {
    answersObj[idx] = val;
  });

  return (
    <div className="p-3 border rounded-md">
      <FillInBlankRenderer
        text={question.content_text || question.question_text || ''}
        separator={question.gap_separator || ','}
        answers={answersObj}
        onAnswerChange={onAnswerChange}
        disabled={disabled}
        showCorrectAnswers={showResult}
        correctAnswers={correctAnswers}
        shuffleOptions={true}
      />
      {showResult && (
        <div className="mt-2 text-sm">
          {answers.every((val, idx) => (val||'').trim().toLowerCase() === (correctAnswers[idx]||'').toString().trim().toLowerCase()) ? (
            <span className="text-green-700">All gaps correct</span>
          ) : (
            <span className="text-red-700">Some answers are incorrect. Correct: {correctAnswers.join(', ')}</span>
          )}
        </div>
      )}
    </div>
  );
};
