/// <reference types="react" />

import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { StoreProvider } from './contexts/StoreContext';
import { RootStore } from './store/RootStore';
import AppRoutes from './routes';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

const rootStore = new RootStore();

function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <StoreProvider store={rootStore}>
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
