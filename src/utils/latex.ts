import katex from 'katex';
import 'katex/dist/katex.min.css';

export interface LatexMatch {
  type: 'inline' | 'block';
  start: number;
  end: number;
  content: string;
  latex: string;
}

/**
 * Находит все LaTeX формулы в тексте
 */
export function findLatexFormulas(text: string): LatexMatch[] {
  const matches: LatexMatch[] = [];
  
  // Inline формулы: $...$
  const inlineRegex = /\$([^$\n]+?)\$/g;
  let match;
  while ((match = inlineRegex.exec(text)) !== null) {
    matches.push({
      type: 'inline',
      start: match.index,
      end: match.index + match[0].length,
      content: match[0],
      latex: match[1]
    });
  }
  
  // Block формулы: $$...$$
  const blockRegex = /\$\$([\s\S]*?)\$\$/g;
  while ((match = blockRegex.exec(text)) !== null) {
    matches.push({
      type: 'block',
      start: match.index,
      end: match.index + match[0].length,
      content: match[0],
      latex: match[1]
    });
  }
  
  // Сортируем по позиции
  return matches.sort((a, b) => a.start - b.start);
}

/**
 * Рендерит LaTeX формулу в HTML
 */
export function renderLatex(latex: string, displayMode: boolean = false): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      errorColor: '#cc0000'
    });
  } catch (error) {
    console.error('LaTeX rendering error:', error);
    return `<span style="color: #cc0000;">LaTeX Error: ${latex}</span>`;
  }
}

/**
 * Преобразует текст с LaTeX формулами в HTML
 */
export function renderTextWithLatex(text: string): string {
  const matches = findLatexFormulas(text);
  if (matches.length === 0) {
    return text;
  }
  
  let result = '';
  let lastIndex = 0;
  
  for (const match of matches) {
    // Добавляем текст до формулы
    result += text.slice(lastIndex, match.start);
    
    // Рендерим формулу
    const rendered = renderLatex(match.latex, match.type === 'block');
    result += rendered;
    
    lastIndex = match.end;
  }
  
  // Добавляем оставшийся текст
  result += text.slice(lastIndex);
  
  return result;
}

/**
 * Валидирует LaTeX синтаксис
 */
export function validateLatex(latex: string): { isValid: boolean; error?: string } {
  try {
    katex.renderToString(latex, { throwOnError: true });
    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Вставляет LaTeX формулу в текст
 */
export function insertLatexFormula(
  text: string, 
  cursorPosition: number, 
  latex: string, 
  type: 'inline' | 'block' = 'inline'
): { newText: string; newCursorPosition: number } {
  const delimiter = type === 'inline' ? '$' : '$$';
  const formula = `${delimiter}${latex}${delimiter}`;
  
  const newText = text.slice(0, cursorPosition) + formula + text.slice(cursorPosition);
  const newCursorPosition = cursorPosition + formula.length;
  
  return { newText, newCursorPosition };
}

/**
 * Базовые математические символы для toolbar
 */
export const mathSymbols = {
  basic: [
    { symbol: '\\alpha', label: 'α' },
    { symbol: '\\beta', label: 'β' },
    { symbol: '\\gamma', label: 'γ' },
    { symbol: '\\delta', label: 'δ' },
    { symbol: '\\epsilon', label: 'ε' },
    { symbol: '\\theta', label: 'θ' },
    { symbol: '\\lambda', label: 'λ' },
    { symbol: '\\mu', label: 'μ' },
    { symbol: '\\pi', label: 'π' },
    { symbol: '\\sigma', label: 'σ' },
    { symbol: '\\phi', label: 'φ' },
    { symbol: '\\omega', label: 'ω' }
  ],
  operators: [
    { symbol: '\\pm', label: '±' },
    { symbol: '\\mp', label: '∓' },
    { symbol: '\\times', label: '×' },
    { symbol: '\\div', label: '÷' },
    { symbol: '\\cdot', label: '·' },
    { symbol: '\\sqrt{}', label: '√' },
    { symbol: '\\frac{}{}', label: '⁄' },
    { symbol: '\\sum', label: '∑' },
    { symbol: '\\int', label: '∫' },
    { symbol: '\\infty', label: '∞' },
    { symbol: '\\approx', label: '≈' },
    { symbol: '\\neq', label: '≠' },
    { symbol: '\\leq', label: '≤' },
    { symbol: '\\geq', label: '≥' }
  ],
  functions: [
    { symbol: '\\sin', label: 'sin' },
    { symbol: '\\cos', label: 'cos' },
    { symbol: '\\tan', label: 'tan' },
    { symbol: '\\log', label: 'log' },
    { symbol: '\\ln', label: 'ln' },
    { symbol: '\\exp', label: 'exp' }
  ]
};
