import React from 'react';
import { renderTextWithLatex } from '../../../utils/latex';

interface TextCompletionQuestionProps {
  question: any;
  answers: string[];
  onAnswerChange: (index: number, value: string) => void;
  disabled?: boolean;
  showResult?: boolean;
}

export const TextCompletionQuestion: React.FC<TextCompletionQuestionProps> = ({
  question,
  answers,
  onAnswerChange,
  disabled,
  showResult
}) => {
  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="leading-relaxed">
        {(() => {
          const text = (question.content_text || '').toString();
          // Remove the options from brackets, keep only the blanks
          const cleanedText = text.replace(/\[\[([^\]]+)\]\]/g, () => '[[blank]]');
          const parts = cleanedText.split(/\[\[(.*?)\]\]/g);
          let gapIndex = 0;
          
          return (
            <div className="flex flex-wrap items-baseline gap-1">
              {parts.map((part: string, index: number) => {
                const isGap = index % 2 === 1;
                if (!isGap) {
                  return <span key={index} dangerouslySetInnerHTML={{ __html: renderTextWithLatex(part) }} />;
                }
                const currentGapIndex = gapIndex++;
                return (
                  <input
                    key={index}
                    type="text"
                    value={answers[currentGapIndex] || ''}
                    onChange={(e) => onAnswerChange(currentGapIndex, e.target.value)}
                    className="inline-block mx-1 px-2 py-1 border-b-2 border-blue-500 bg-transparent text-center w-[120px] focus:outline-none focus:border-blue-700"
                    disabled={disabled}
                  />
                );
              })}
            </div>
          );
        })()}
      </div>
      {showResult && (
        <div className="mt-3 text-sm">
          {(() => {
            const correctAnswers: string[] = Array.isArray(question.correct_answer) ? question.correct_answer : (question.correct_answer ? [question.correct_answer] : []);
            const isCorrect = answers.length === correctAnswers.length && 
              answers.every((val, idx) => (val||'').trim().toLowerCase() === (correctAnswers[idx]||'').toString().trim().toLowerCase());
            
            if (isCorrect) {
              return <span className="text-green-700">All blanks correct! ✓</span>;
            } else {
              return (
                <div className="text-red-700">
                  <div className="mt-1">
                    <strong>Correct answers:</strong> {correctAnswers.join(', ')}
                  </div>
                </div>
              );
            }
          })()}
        </div>
      )}
    </div>
  );
};
