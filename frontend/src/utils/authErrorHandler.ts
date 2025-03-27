/**
 * Authentication error handler utility
 * This prevents accidental token removal on errors and ensures consistent auth behavior
 */

import axios from 'axios';

/**
 * Handle authentication errors without removing tokens
 * This redirects to login with a special parameter that will handle logout properly
 * @param error The error to handle
 * @param message Optional custom error message to log
 */
export const handleAuthError = (error: any, message = 'Authentication error'): void => {
  console.log(`${message}:`, error);
  
  // Instead of removing tokens directly, redirect to login with action parameter
  // The login page will handle the logout action properly
  window.location.href = '/login?action=logout';
};

/**
 * Check if an error is an authentication error (401)
 * @param error The error to check
 * @returns Whether the error is an authentication error
 */
export const isAuthError = (error: any): boolean => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    return true;
  }
  
  if (error instanceof Error && error.message.includes('401')) {
    return true;
  }
  
  return false;
};

/**
 * Safe redirect to login without directly removing tokens
 * This should be used instead of directly manipulating localStorage
 */
export const safeRedirectToLogin = (): void => {
  // Redirect to login with a special parameter that will handle logout properly
  window.location.href = '/login?action=logout';
};
