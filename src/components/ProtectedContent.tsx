import React, { useRef, useEffect } from 'react';
import { useCopyProtection } from '../utils/copyProtection';

interface ProtectedContentProps {
  children: React.ReactNode;
  className?: string;
  showWarning?: boolean;
  warningMessage?: string;
  isTeacher?: boolean; // Если true, защита не применяется
}

export default function ProtectedContent({
  children,
  className = '',
  showWarning = true,
  warningMessage = 'Копирование контента запрещено',
  isTeacher = false
}: ProtectedContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { enableProtection, disableProtection } = useCopyProtection({
    disableSelection: true,
    disableContextMenu: true,
    disableKeyboardShortcuts: true,
    showWarning,
    warningMessage
  });

  useEffect(() => {
    if (contentRef.current && !isTeacher) {
      enableProtection(contentRef.current);
    }

    return () => {
      if (!isTeacher) {
        disableProtection();
      }
    };
  }, [enableProtection, disableProtection, isTeacher]);

  return (
    <div
      ref={contentRef}
      className={`${isTeacher ? '' : 'student-content copy-protected'} ${className}`}
    >
      {children}
      {!isTeacher && (
        <div className="copy-protection-notice">
        </div>
      )}
    </div>
  );
}
