import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Router from "./routes/Router";

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
