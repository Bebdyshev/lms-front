import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Router from "./routes/Router";

// Suppress NextStep.js navigation warning for React SPA
// This runs before React mounts to catch the warning early
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = args[0];
  if (
    typeof message === 'string' && 
    message.includes('Navigation is not available, using window adapter')
  ) {
    // Suppress this warning - we're intentionally using window adapter for React SPA
    return;
  }
  originalWarn.apply(console, args);
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
