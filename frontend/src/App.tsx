/// <reference types="react" />

import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { StoreProvider } from './contexts/StoreContext';
import AppRoutes from './routes';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <AuthProvider>
          <ThemeProvider>
            <Router>
              <AppRoutes />
            </Router>
          </ThemeProvider>
        </AuthProvider>
      </StoreProvider>
    </ErrorBoundary>
  );
}

export default App;
