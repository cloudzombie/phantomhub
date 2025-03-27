/**
 * Error handler utility that prevents accidental logout on errors
 * This is crucial for maintaining authentication persistence across page refreshes
 */

import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

/**
 * Handle API errors without removing tokens
 * @param error The error to handle
 * @param message Optional custom error message
 * @returns The error message to display
 */
export const handleApiError = (error: any, message = 'An error occurred'): string => {
  console.error('API Error:', error);
  
  // Extract error message if available
  let errorMessage = message;
  if (axios.isAxiosError(error)) {
    errorMessage = error.response?.data?.message || error.message || message;
    console.log('API Error details:', { 
      status: error.response?.status,
      message: errorMessage
    });
  }
  
  // IMPORTANT: We intentionally DO NOT remove tokens here
  // This prevents logout on temporary errors or page refreshes
  
  return errorMessage;
};

/**
 * Check if a user should be redirected to login without removing tokens
 * @param error The error to check
 * @returns Whether the user should be redirected
 */
export const shouldRedirectToLogin = (error: any): boolean => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    // Even for 401 errors, we don't remove tokens automatically
    // Instead, we let the AuthContext handle this properly
    console.log('Authentication error detected, but keeping tokens');
    return true;
  }
  return false;
};

/**
 * Safe redirect to login without removing tokens
 * This should be used instead of directly manipulating localStorage
 */
export const safeRedirectToLogin = (): void => {
  // Redirect to login with a special parameter that will handle logout properly
  window.location.href = '/login?action=logout';
};
