import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FiAlertCircle } from 'react-icons/fi';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="max-w-md w-full p-6 bg-slate-800 rounded-lg shadow-lg">
            <div className="flex items-center justify-center mb-6">
              <FiAlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white text-center mb-4">
              Something went wrong
            </h2>
            <p className="text-slate-400 text-center mb-6">
              We apologize for the inconvenience. Please try refreshing the page or contact support if the problem persists.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-4 bg-slate-700 rounded-md">
                <h3 className="text-sm font-medium text-white mb-2">Error Details:</h3>
                <pre className="text-xs text-slate-300 overflow-auto">
                  {this.state.error?.toString()}
                </pre>
                <pre className="text-xs text-slate-300 mt-2 overflow-auto">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            )}
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 