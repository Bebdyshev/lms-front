// Utility for protecting text content from copying
export interface CopyProtectionOptions {
  disableSelection?: boolean;
  disableContextMenu?: boolean;
  disableKeyboardShortcuts?: boolean;
  showWarning?: boolean;
  warningMessage?: string;
}

export class CopyProtection {
  private options: CopyProtectionOptions;
  private element: HTMLElement | null = null;
  private isEnabled: boolean = false;

  constructor(options: CopyProtectionOptions = {}) {
    this.options = {
      disableSelection: true,
      disableContextMenu: true,
      disableKeyboardShortcuts: true,
      showWarning: true,
      warningMessage: 'Копирование контента запрещено',
      ...options
    };
  }

  enable(element: HTMLElement) {
    if (this.isEnabled) {
      this.disable();
    }

    this.element = element;
    this.isEnabled = true;

    // Apply CSS protection
    this.applyCSSProtection();

    // Apply JavaScript protection
    this.applyJSProtection();

    // Add warning overlay if enabled
    if (this.options.showWarning) {
      this.addWarningOverlay();
    }
  }

  disable() {
    if (!this.isEnabled || !this.element) return;

    // Remove CSS protection
    this.removeCSSProtection();

    // Remove JavaScript protection
    this.removeJSProtection();

    // Remove warning overlay
    this.removeWarningOverlay();

    this.element = null;
    this.isEnabled = false;
  }

  private applyCSSProtection() {
    if (!this.element) return;

    // Disable text selection
    if (this.options.disableSelection) {
      this.element.style.userSelect = 'none';
      this.element.style.webkitUserSelect = 'none';
      this.element.style.mozUserSelect = 'none';
      this.element.style.msUserSelect = 'none';
    }

    // Disable dragging
    this.element.style.draggable = 'false';
    this.element.setAttribute('draggable', 'false');

    // Add protection class
    this.element.classList.add('copy-protected');
  }

  private removeCSSProtection() {
    if (!this.element) return;

    // Re-enable text selection
    this.element.style.userSelect = '';
    this.element.style.webkitUserSelect = '';
    this.element.style.mozUserSelect = '';
    this.element.style.msUserSelect = '';

    // Re-enable dragging
    this.element.style.draggable = '';
    this.element.removeAttribute('draggable');

    // Remove protection class
    this.element.classList.remove('copy-protected');
  }

  private applyJSProtection() {
    if (!this.element) return;

    // Disable context menu
    if (this.options.disableContextMenu) {
      this.element.addEventListener('contextmenu', this.handleContextMenu);
    }

    // Disable keyboard shortcuts
    if (this.options.disableKeyboardShortcuts) {
      this.element.addEventListener('keydown', this.handleKeyDown);
    }

    // Disable copy events
    this.element.addEventListener('copy', this.handleCopy);
    this.element.addEventListener('cut', this.handleCopy);

    // Disable selection events
    this.element.addEventListener('selectstart', this.handleSelectStart);
    this.element.addEventListener('mousedown', this.handleMouseDown);
  }

  private removeJSProtection() {
    if (!this.element) return;

    // Remove event listeners
    this.element.removeEventListener('contextmenu', this.handleContextMenu);
    this.element.removeEventListener('keydown', this.handleKeyDown);
    this.element.removeEventListener('copy', this.handleCopy);
    this.element.removeEventListener('cut', this.handleCopy);
    this.element.removeEventListener('selectstart', this.handleSelectStart);
    this.element.removeEventListener('mousedown', this.handleMouseDown);
  }

  private handleContextMenu = (e: Event) => {
    e.preventDefault();
    if (this.options.showWarning) {
      this.showWarning();
    }
    return false;
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    // Block Ctrl+C, Cmd+C, Ctrl+X, Cmd+X
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X')) {
      e.preventDefault();
      if (this.options.showWarning) {
        this.showWarning();
      }
      return false;
    }

    // Block Ctrl+A, Cmd+A (select all)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      if (this.options.showWarning) {
        this.showWarning();
      }
      return false;
    }
  };

  private handleCopy = (e: Event) => {
    e.preventDefault();
    if (this.options.showWarning) {
      this.showWarning();
    }
    return false;
  };

  private handleSelectStart = (e: Event) => {
    if (this.options.disableSelection) {
      e.preventDefault();
      return false;
    }
  };

  private handleMouseDown = (e: MouseEvent) => {
    // Prevent text selection on double click
    if (e.detail >= 2) {
      e.preventDefault();
      return false;
    }
  };

  private showWarning() {
    // Create warning element
    const warning = document.createElement('div');
    warning.className = 'copy-protection-warning';
    warning.textContent = this.options.warningMessage || 'Копирование контента запрещено';
    warning.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideIn 0.3s ease-out;
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    // Add to DOM
    document.body.appendChild(warning);

    // Remove after 3 seconds
    setTimeout(() => {
      if (warning.parentNode) {
        warning.parentNode.removeChild(warning);
      }
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }, 3000);
  }

  private addWarningOverlay() {
    if (!this.element) return;

    // Add subtle overlay to indicate protection
    const overlay = document.createElement('div');
    overlay.className = 'copy-protection-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      background: linear-gradient(45deg, transparent 49%, rgba(59, 130, 246, 0.02) 50%, transparent 51%);
      background-size: 20px 20px;
      z-index: 1;
    `;

    this.element.style.position = 'relative';
    this.element.appendChild(overlay);
  }

  private removeWarningOverlay() {
    if (!this.element) return;

    const overlay = this.element.querySelector('.copy-protection-overlay');
    if (overlay) {
      overlay.remove();
    }
  }
}

import React from 'react';

// React Hook for copy protection
export const useCopyProtection = (options?: CopyProtectionOptions) => {
  const protectionRef = React.useRef<CopyProtection | null>(null);

  const enableProtection = React.useCallback((element: HTMLElement) => {
    if (!protectionRef.current) {
      protectionRef.current = new CopyProtection(options);
    }
    protectionRef.current.enable(element);
  }, [options]);

  const disableProtection = React.useCallback(() => {
    if (protectionRef.current) {
      protectionRef.current.disable();
    }
  }, []);

  React.useEffect(() => {
    return () => {
      disableProtection();
    };
  }, [disableProtection]);

  return { enableProtection, disableProtection };
};

// CSS classes for copy protection
export const copyProtectionStyles = `
  .copy-protected {
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    user-select: none !important;
    -webkit-touch-callout: none !important;
    -webkit-tap-highlight-color: transparent !important;
  }

  .copy-protected * {
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    user-select: none !important;
  }

  .copy-protected::selection {
    background: transparent !important;
  }

  .copy-protected *::selection {
    background: transparent !important;
  }
`;
