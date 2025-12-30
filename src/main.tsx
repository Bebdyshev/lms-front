import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'katex/dist/katex.min.css';
import Router from "./routes/Router";
import Snowfall from 'react-snowfall';

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
    <Snowfall 
      color="#e8e8e8ff"
      snowflakeCount={100}
      style={{
        position: 'fixed',
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        pointerEvents: 'none'
      }}
    />
    <Router />
  </React.StrictMode>
);
