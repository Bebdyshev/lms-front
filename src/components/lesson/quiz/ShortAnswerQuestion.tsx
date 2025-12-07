import React from 'react';

interface ShortAnswerQuestionProps {
  question: any;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  showResult?: boolean;
}

export const ShortAnswerQuestion: React.FC<ShortAnswerQuestionProps> = ({
  question,
  value,
  onChange,
  disabled,
  showResult
}) => {
  const correctAnswers = (question.correct_answer || '').toString().split('|').map((a: string) => a.trim().toLowerCase()).filter((a: string) => a.length > 0);
  const userVal = (value || '').toString().trim().toLowerCase();
  const isCorrect = correctAnswers.includes(userVal);

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your answer..."
        className={`w-full p-4 border-2 rounded-lg focus:outline-none ${
          showResult
            ? isCorrect
              ? 'border-green-500 bg-green-50'
              : 'border-red-500 bg-red-50'
            : 'border-gray-300 focus:border-blue-500'
        }`}
        disabled={disabled}
      />
      {showResult && isCorrect && (
        <div className="mt-2 text-sm">
          <span className="text-green-700">Correct answer! ✓</span>
        </div>
      )}
    </div>
  );
};
