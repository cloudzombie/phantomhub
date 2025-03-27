/**
 * Token Manager Utility
 * Centralizes token management to prevent accidental token removal
 * This is crucial for maintaining authentication persistence across page refreshes
 */

import axios from 'axios';

/**
 * Get the authentication token from storage
 * Checks localStorage only to prevent sync loops
 */
export const getToken = (): string | null => {
  try {
    // Only use localStorage to prevent sync loops
    const token = localStorage.getItem('token');
    
    if (token) {
      // Set the Authorization header for all future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    return token;
  } catch (err) {
    console.error('TokenManager: Error retrieving token:', err);
    return null;
  }
};

/**
 * Store the authentication token
 */
export const storeToken = (token: string): void => {
  if (!token) {
    console.warn('TokenManager: Attempted to store empty token, ignoring');
    return;
  }

  try {
    // Store only in localStorage to prevent sync loops
    localStorage.setItem('token', token);
    
    // Set the Authorization header for axios
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } catch (err) {
    console.error('TokenManager: Error storing token:', err);
  }
};

/**
 * Store user data
 */
export const storeUserData = (userData: any): void => {
  if (!userData || typeof userData !== 'object') {
    console.warn('TokenManager: Invalid user data provided, not storing');
    return;
  }
  
  try {
    // Store only in localStorage to prevent sync loops
    const userString = JSON.stringify(userData);
    localStorage.setItem('user', userString);
  } catch (err) {
    console.error('TokenManager: Failed to store user data:', err);
  }
};

/**
 * Get user data from storage
 */
export const getUserData = (): any => {
  try {
    // Only use localStorage to prevent sync loops
    const userDataString = localStorage.getItem('user');
    
    if (!userDataString) {
      return null;
    }
    
    try {
      const userData = JSON.parse(userDataString);
      
      if (!userData || typeof userData !== 'object') {
        return null;
      }
      
      return userData;
    } catch (parseError) {
      console.error('TokenManager: Error parsing user data', parseError);
      return null;
    }
  } catch (error) {
    console.error('TokenManager: Error retrieving user data', error);
    return null;
  }
};

/**
 * Handle authentication errors without removing tokens
 * This redirects to login with a special parameter that will handle logout properly
 */
export const handleAuthError = (error: any, message = 'Authentication error'): void => {
  console.log(`TokenManager: ${message}`, error);
  
  // Instead of removing tokens directly, redirect to login with action parameter
  // The login page will handle the logout action properly
  window.location.href = '/login?action=logout';
};

/**
 * Check if an error is an authentication error (401)
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
 * Safe logout that redirects to login page with proper action parameter
 * This should be used instead of directly manipulating localStorage
 */
export const safeLogout = (): void => {
  // Clear auth data first
  clearAuthData();
  // Redirect to login with a special parameter that will handle logout properly
  window.location.href = '/login?action=logout';
};

/**
 * Clear all authentication data
 */
export const clearAuthData = (): void => {
  try {
    // Remove token and user data from localStorage only
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear Authorization header
    delete axios.defaults.headers.common['Authorization'];
  } catch (err) {
    console.error('TokenManager: Error clearing auth data:', err);
  }
};
