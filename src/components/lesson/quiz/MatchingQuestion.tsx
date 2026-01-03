import { useState, useMemo } from 'react';
import { renderTextWithLatex } from '../../../utils/latex';

interface MatchingPair {
  left: string;
  right: string;
}

interface MatchingQuestionProps {
  question: {
    id: string;
    matching_pairs?: MatchingPair[];
  };
  // Map from left index to selected right index (can be Map or plain object from JSON)
  value: Map<number, number> | Record<number, number> | undefined;
  onChange: (value: Map<number, number>) => void;
  disabled?: boolean;
  showResult?: boolean;
}

export const MatchingQuestion = ({
  question,
  value,
  onChange,
  disabled = false,
  showResult = false,
}: MatchingQuestionProps) => {
  const pairs = question.matching_pairs || [];
  
  // Shuffle right side options (memoized to stay stable)
  const shuffledRightIndices = useMemo(() => {
    const indices = pairs.map((_, i) => i);
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [pairs.length]);

  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  
  // Convert value to Map if it's a plain object or ensure it's a Map
  const answers = useMemo(() => {
    if (!value) return new Map<number, number>();
    if (value instanceof Map) return value;
    // If it's a plain object (from JSON serialization), convert to Map
    if (typeof value === 'object') {
      const map = new Map<number, number>();
      Object.entries(value).forEach(([key, val]) => {
        map.set(Number(key), Number(val));
      });
      return map;
    }
    return new Map<number, number>();
  }, [value]);

  const handleLeftClick = (leftIdx: number) => {
    if (disabled) return;
    setSelectedLeft(leftIdx === selectedLeft ? null : leftIdx);
  };

  const handleRightClick = (rightIdx: number) => {
    if (disabled || selectedLeft === null) return;
    
    const newAnswers = new Map(answers);
    // Remove any existing mapping to this right index
    for (const [key, val] of newAnswers.entries()) {
      if (val === rightIdx) {
        newAnswers.delete(key);
      }
    }
    // Set new mapping
    newAnswers.set(selectedLeft, rightIdx);
    onChange(newAnswers);
    setSelectedLeft(null);
  };

  const getLeftStatus = (leftIdx: number): 'selected' | 'matched' | 'correct' | 'incorrect' | 'default' => {
    if (selectedLeft === leftIdx) return 'selected';
    if (answers.has(leftIdx)) {
      if (showResult) {
        return answers.get(leftIdx) === leftIdx ? 'correct' : 'incorrect';
      }
      return 'matched';
    }
    return 'default';
  };

  const getRightStatus = (rightIdx: number): 'available' | 'matched' | 'correct' | 'incorrect' | 'default' => {
    const isMatched = Array.from(answers.values()).includes(rightIdx);
    if (isMatched) {
      if (showResult) {
        // Find which left was matched to this right
        const leftIdx = Array.from(answers.entries()).find(([_, v]) => v === rightIdx)?.[0];
        return leftIdx === rightIdx ? 'correct' : 'incorrect';
      }
      return 'matched';
    }
    if (selectedLeft !== null) return 'available';
    return 'default';
  };

  // Find connected pairs for drawing lines (visual connection)
  const getMatchedRightForLeft = (leftIdx: number): number | undefined => {
    return answers.get(leftIdx);
  };

  // Get which left item is matched to this right item
  const getMatchedLeftForRight = (rightIdx: number): number | undefined => {
    for (const [left, right] of answers.entries()) {
      if (right === rightIdx) return left;
    }
    return undefined;
  };

  // Color palette for matched pairs
  const pairColors = [
    { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700', badge: 'bg-blue-200' },
    { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700', badge: 'bg-green-200' },
    { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700', badge: 'bg-purple-200' },
    { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-700', badge: 'bg-orange-200' },
    { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-700', badge: 'bg-pink-200' },
    { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-700', badge: 'bg-teal-200' },
    { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-700', badge: 'bg-indigo-200' },
    { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-700', badge: 'bg-yellow-200' },
  ];

  const getColorForPair = (leftIdx: number) => {
    return pairColors[leftIdx % pairColors.length];
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-6">
        {/* Left side - Terms */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">1</span>
            Left
          </div>
          {pairs.map((pair, leftIdx) => {
            const status = getLeftStatus(leftIdx);
            const matchedRight = getMatchedRightForLeft(leftIdx);
            const isMatched = matchedRight !== undefined;
            const color = isMatched ? getColorForPair(leftIdx) : null;
            const displayLetter = matchedRight !== undefined 
              ? String.fromCharCode(65 + shuffledRightIndices.indexOf(matchedRight))
              : null;
            
            let style = '';
            if (status === 'selected') {
              style = 'border-blue-500 bg-blue-50 ring-2 ring-blue-300 shadow-md';
            } else if (showResult) {
              style = status === 'correct' 
                ? 'border-green-500 bg-green-50' 
                : status === 'incorrect' 
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 bg-white';
            } else if (isMatched && color) {
              style = `${color.border} ${color.bg}`;
            } else {
              style = 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50';
            }
            
            return (
              <div
                key={`left-${leftIdx}`}
                onClick={() => handleLeftClick(leftIdx)}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${style} ${disabled ? 'cursor-not-allowed opacity-75' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                      isMatched && color ? `${color.badge} ${color.text}` : 'bg-gray-100 text-gray-600'
                    }`}>
                      {leftIdx + 1}
                    </span>
                    <span className="flex-1" dangerouslySetInnerHTML={{ __html: renderTextWithLatex(pair.left) }} />
                  </div>
                  {isMatched && displayLetter && (
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${color?.badge} ${color?.text}`}>
                      <span>→</span>
                      <span className="font-bold">{displayLetter}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right side - Definitions (shuffled) */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">2</span>
            Right
          </div>
          {shuffledRightIndices.map((originalIdx, displayIdx) => {
            const pair = pairs[originalIdx];
            const status = getRightStatus(originalIdx);
            const matchedLeft = getMatchedLeftForRight(originalIdx);
            const isMatched = matchedLeft !== undefined;
            const color = isMatched ? getColorForPair(matchedLeft) : null;
            const displayLetter = String.fromCharCode(65 + displayIdx);
            
            let style = '';
            if (showResult) {
              style = status === 'correct' 
                ? 'border-green-500 bg-green-50' 
                : status === 'incorrect' 
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 bg-white';
            } else if (isMatched && color) {
              style = `${color.border} ${color.bg}`;
            } else if (selectedLeft !== null) {
              style = 'border-blue-300 bg-blue-50 hover:border-blue-500 cursor-pointer shadow-sm';
            } else {
              style = 'border-gray-200 bg-white';
            }
            
            return (
              <div
                key={`right-${originalIdx}`}
                onClick={() => handleRightClick(originalIdx)}
                className={`p-4 rounded-xl border-2 transition-all ${style} ${disabled ? 'cursor-not-allowed opacity-75' : ''} ${selectedLeft === null && !isMatched ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    isMatched && color ? `${color.badge} ${color.text}` : 'bg-gray-100 text-gray-600'
                  }`}>
                    {displayLetter}
                  </span>
                  <span className="flex-1" dangerouslySetInnerHTML={{ __html: renderTextWithLatex(pair.right) }} />
                  {isMatched && matchedLeft !== undefined && (
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${color?.badge} ${color?.text}`}>
                      <span className="font-bold">{matchedLeft + 1}</span>
                      <span>←</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
