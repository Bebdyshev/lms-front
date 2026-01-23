import React, { useState, useEffect, useCallback, useRef } from 'react';
import { lookupWord, quickCreateFlashcard } from '../../services/api';
import './TextLookupPopover.css';

interface LookupResult {
  word: string;
  phonetic: string | null;
  part_of_speech: string | null;
  definition_en: string;
  translation_ru: string;
  synonyms: string[];
  usage_example: string | null;
  etymology: string | null;
}

interface TextLookupPopoverProps {
  containerRef: React.RefObject<HTMLElement>;
}

export const TextLookupPopover: React.FC<TextLookupPopoverProps> = ({ containerRef }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [contextSentence, setContextSentence] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleLookup = useCallback(async (text: string, context?: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setSaveSuccess(false);
    
    try {
      const lookupResult = await lookupWord(text, context);
      setResult(lookupResult);
    } catch (err: any) {
      setError(err.message || 'Failed to lookup word');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSaveToFlashcards = async () => {
    if (!result) return;
    
    setIsSaving(true);
    try {
      await quickCreateFlashcard({
        word: result.word,
        translation: result.translation_ru,
        definition: result.definition_en,
        context: contextSentence,
        phonetic: result.phonetic || undefined
      });
      setSaveSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to save flashcard');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setResult(null);
    setError(null);
    setSelectedText('');
    setSaveSuccess(false);
  }, []);

  // Get surrounding context from selection
  const getContextSentence = (selection: Selection): string | undefined => {
    const anchorNode = selection.anchorNode;
    if (!anchorNode?.parentElement) return undefined;
    
    const text = anchorNode.textContent || '';
    const selectedStr = selection.toString();
    const idx = text.indexOf(selectedStr);
    
    if (idx === -1) return undefined;
    
    // Get a window around the selected text
    const start = Math.max(0, idx - 50);
    const end = Math.min(text.length, idx + selectedStr.length + 50);
    
    return text.substring(start, end).trim();
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseUp = () => {
      // Small delay to let selection finalize
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        
        if (text && text.length > 0 && text.length <= 100) {
          // Check if selection is within our container
          const anchorNode = selection?.anchorNode;
          if (!anchorNode || !container.contains(anchorNode)) return;
          
          const context = selection ? getContextSentence(selection) : undefined;
          setContextSentence(context);
          setSelectedText(text);
          
          // Position popover near selection
          const rect = selection!.getRangeAt(0).getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          
          setPosition({
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.bottom - containerRect.top + 10
          });
          
          setIsVisible(true);
          setResult(null);
          setError(null);
          setSaveSuccess(false);
        }
      }, 10);
    };

    container.addEventListener('mouseup', handleMouseUp);
    
    // Close on click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [containerRef, handleClose]);

  if (!isVisible) return null;

  return (
    <div 
      ref={popoverRef}
      className="text-lookup-popover"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      {/* Mini toolbar before lookup */}
      {!result && !isLoading && !error && (
        <div className="lookup-toolbar">
          <span className="selected-text">"{selectedText}"</span>
          <button 
            className="lookup-btn"
            onClick={() => handleLookup(selectedText, contextSentence)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
            Look Up
          </button>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="lookup-loading">
          <div className="spinner" />
          <span>Looking up...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="lookup-error">
          <span>{error}</span>
          <button onClick={handleClose}>Close</button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="lookup-result">
          <div className="lookup-header">
            <div className="word-info">
              <span className="word">{result.word}</span>
              {result.phonetic && <span className="phonetic">{result.phonetic}</span>}
              {result.part_of_speech && <span className="pos">{result.part_of_speech}</span>}
            </div>
            <button className="close-btn" onClick={handleClose}>×</button>
          </div>
          
          <div className="lookup-sections">
            <div className="section">
              <div className="section-title">English</div>
              <div className="definition">{result.definition_en}</div>
            </div>
            
            <div className="section">
              <div className="section-title">Русский</div>
              <div className="translation">{result.translation_ru}</div>
            </div>
            
            {result.synonyms.length > 0 && (
              <div className="section">
                <div className="section-title">Synonyms</div>
                <div className="synonyms">
                  {result.synonyms.map((syn, i) => (
                    <span key={i} className="synonym">{syn}</span>
                  ))}
                </div>
              </div>
            )}
            
            {result.usage_example && (
              <div className="section">
                <div className="section-title">Example</div>
                <div className="example">{result.usage_example}</div>
              </div>
            )}
          </div>
          
          <div className="lookup-actions">
            {saveSuccess ? (
              <span className="save-success">✓ Added to vocabulary</span>
            ) : (
              <button 
                className="save-btn"
                onClick={handleSaveToFlashcards}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : '+ Add to Flashcards'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TextLookupPopover;
