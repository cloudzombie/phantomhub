import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { addMessage } from '../store/slices/uiSlice';
import { isAuthError } from '../utils/tokenManager';
import { handleAuthError } from '../utils/tokenManager';

interface ApiError {
  status?: number;
  data?: {
    message?: string;
    error?: string;
  };
  message?: string;
}

interface UseApiErrorOptions {
  showMessage?: boolean;
  handleAuth?: boolean;
  customMessages?: {
    [key: number]: string;
  };
}

const defaultCustomMessages: { [key: number]: string } = {
  400: 'Invalid request. Please check your input.',
  401: 'Authentication required. Please log in.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  500: 'An unexpected error occurred. Please try again later.',
};

export const useApiError = (options: UseApiErrorOptions = {}) => {
  const {
    showMessage = true,
    handleAuth = true,
    customMessages = {},
  } = options;

  const dispatch = useDispatch();

  const handleError = useCallback(
    (error: ApiError) => {
      // Handle authentication errors
      if (handleAuth && isAuthError(error)) {
        handleAuthError(error, 'Authentication error');
        return;
      }

      // Get error message
      let message = 'An unexpected error occurred. Please try again.';

      if (error.status) {
        // Use custom message if provided
        message = customMessages[error.status] || defaultCustomMessages[error.status] || message;
      } else if (error.data?.message) {
        message = error.data.message;
      } else if (error.message) {
        message = error.message;
      }

      // Show error message if enabled
      if (showMessage) {
        dispatch(
          addMessage({
            type: 'error',
            text: message,
          })
        );
      }

      // Log error for debugging
      console.error('API Error:', error);

      return message;
    },
    [dispatch, handleAuth, showMessage, customMessages]
  );

  return handleError;
}; 