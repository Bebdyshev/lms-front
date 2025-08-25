import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface LatexRendererProps {
  content: string;
}

const LatexRenderer: React.FC<LatexRendererProps> = ({ content }) => {
  // Функция для поиска LaTeX формул в тексте
  const findLatexFormulas = (text: string) => {
    const inlineRegex = /\$([^$\n]+?)\$/g;
    const blockRegex = /\$\$([^$]+?)\$\$/g;
    
    const parts: Array<{ type: 'text' | 'inline' | 'block'; content: string }> = [];
    let lastIndex = 0;
    
    // Находим inline формулы
    let match;
    while ((match = inlineRegex.exec(text)) !== null) {
      // Добавляем текст перед формулой
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        });
      }
      
      // Добавляем inline формулу
      parts.push({
        type: 'inline',
        content: match[1]
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Находим block формулы
    lastIndex = 0;
    const blockParts: Array<{ type: 'text' | 'inline' | 'block'; content: string }> = [];
    
    while ((match = blockRegex.exec(text)) !== null) {
      // Добавляем текст перед формулой
      if (match.index > lastIndex) {
        blockParts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        });
      }
      
      // Добавляем block формулу
      blockParts.push({
        type: 'block',
        content: match[1]
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Добавляем оставшийся текст
    if (lastIndex < text.length) {
      blockParts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }
    
    return blockParts.length > 0 ? blockParts : parts;
  };

  const parts = findLatexFormulas(content);

  return (
    <div className="latex-renderer">
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.content}</span>;
        } else if (part.type === 'inline') {
          try {
            return <InlineMath key={index} math={part.content} />;
          } catch (error) {
            return <span key={index} className="text-red-500">${part.content}$</span>;
          }
        } else if (part.type === 'block') {
          try {
            return (
              <div key={index} className="my-4 text-center">
                <BlockMath math={part.content} />
              </div>
            );
          } catch (error) {
            return <div key={index} className="text-red-500 my-4">$${part.content}$$</div>;
          }
        }
        return null;
      })}
    </div>
  );
};

export default LatexRenderer;
