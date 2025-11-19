import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { renderTextWithLatex } from '../../utils/latex';

interface FillInBlankRendererProps {
  text: string;
  separator?: string;
  answers?: Record<number, string>;
  onAnswerChange?: (gapIndex: number, value: string) => void;
  disabled?: boolean;
  showCorrectAnswers?: boolean;
  correctAnswers?: string[];
  shuffleOptions?: boolean;
}

interface GapData {
  index: number;
  options: string[];
  container: HTMLElement | null;
}

export const FillInBlankRenderer: React.FC<FillInBlankRendererProps> = ({
  text,
  separator = ',',
  answers = {},
  onAnswerChange,
  disabled = false,
  showCorrectAnswers = false,
  correctAnswers = [],
  shuffleOptions = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gaps, setGaps] = useState<GapData[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Parse text and create HTML with placeholder containers
    const parts = text.split(/(\[\[.*?\]\])/g);
    const gapData: GapData[] = [];
    let gapIndex = 0;

    const htmlContent = parts.map((part) => {
      const gapMatch = part.match(/\[\[(.*?)\]\]/);
      if (!gapMatch) {
        return renderTextWithLatex(part);
      }

      let options = gapMatch[1]
        .split(separator)
        .map(s => s.trim())
        .filter(Boolean);
      
      if (shuffleOptions) {
        options = [...options].sort(() => Math.random() - 0.5);
      }

      const id = `gap-container-${gapIndex}`;
      gapData.push({ index: gapIndex, options, container: null });
      gapIndex++;
      
      // Create inline container for the select
      return `<span id="${id}" class="inline-block align-baseline mx-1" style="display: inline-block; vertical-align: baseline;"></span>`;
    }).join('');

    // Set HTML content
    containerRef.current.innerHTML = htmlContent;

    // Find all gap containers and store references
    const updatedGaps = gapData.map(gap => {
      const container = containerRef.current?.querySelector(`#gap-container-${gap.index}`) as HTMLElement;
      return { ...gap, container };
    });

    setGaps(updatedGaps);
    setMounted(true);
  }, [text, separator, shuffleOptions]);

  return (
    <div
      ref={containerRef}
      className="text-gray-800 text-lg leading-relaxed prose prose-lg max-w-none"
    >
      {mounted && gaps.map((gap) => {
        if (!gap.container) return null;

        const value = answers[gap.index] || '';
        const correctAnswer = correctAnswers[gap.index];
        
        const isCorrect = showCorrectAnswers && value && correctAnswer &&
          value.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
        const isIncorrect = showCorrectAnswers && value && correctAnswer &&
          value.trim().toLowerCase() !== correctAnswer.trim().toLowerCase();

        return createPortal(
          <Select
            key={gap.index}
            value={value}
            onValueChange={(newValue) => onAnswerChange?.(gap.index, newValue)}
            disabled={disabled}
          >
            <SelectTrigger
              className={`
                inline-flex items-center justify-between h-auto py-1 px-2 text-sm font-medium border-2 rounded
                ${disabled ? 'cursor-not-allowed opacity-70 bg-gray-100' : 'cursor-pointer bg-white hover:bg-gray-50'}
                ${isCorrect ? 'border-green-500 bg-green-50' : ''}
                ${isIncorrect ? 'border-red-500 bg-red-50' : ''}
                ${!showCorrectAnswers ? 'border-blue-400' : ''}
                transition-colors duration-200
              `.trim().replace(/\s+/g, ' ')}
              style={{ display: 'inline-flex', width: 'auto', minWidth: '80px' }}
            >
              <SelectValue placeholder={`#${gap.index + 1}`} />
            </SelectTrigger>
            <SelectContent>
              {gap.options.map((option, optIdx) => (
                <SelectItem key={optIdx} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>,
          gap.container
        );
      })}
    </div>
  );
};
