import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { AuthProvider } from './state/AuthContext';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
