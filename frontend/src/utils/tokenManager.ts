/**
 * Token Manager Utility
 * Centralizes token management to prevent accidental token removal
 * This is crucial for maintaining authentication persistence across page refreshes
 */

import axios from 'axios';

/**
 * Get the authentication token from storage
 * Checks both localStorage and sessionStorage for redundancy
 */
export const getToken = (): string | null => {
  const localToken = localStorage.getItem('token');
  const sessionToken = sessionStorage.getItem('token');
  
  // If token only exists in sessionStorage, restore it to localStorage
  if (!localToken && sessionToken) {
    console.log('TokenManager: Restoring token from sessionStorage to localStorage');
    localStorage.setItem('token', sessionToken);
    return sessionToken;
  }
  
  return localToken || sessionToken || null;
};

/**
 * Safely store the authentication token in both storages
 */
export const storeToken = (token: string): void => {
  localStorage.setItem('token', token);
  sessionStorage.setItem('token', token);
  
  // Set the Authorization header for axios
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

/**
 * Safely store user data in both storages
 */
export const storeUserData = (userData: any): void => {
  const userString = JSON.stringify(userData);
  localStorage.setItem('user', userString);
  sessionStorage.setItem('user', userString);
};

/**
 * Get user data from storage
 */
export const getUserData = (): any => {
  try {
    const localUserData = localStorage.getItem('user');
    const sessionUserData = sessionStorage.getItem('user');
    
    // If user data only exists in sessionStorage, restore it to localStorage
    if (!localUserData && sessionUserData) {
      console.log('TokenManager: Restoring user data from sessionStorage to localStorage');
      localStorage.setItem('user', sessionUserData);
      return JSON.parse(sessionUserData);
    }
    
    return localUserData ? JSON.parse(localUserData) : null;
  } catch (error) {
    console.error('TokenManager: Error parsing user data', error);
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
  // Redirect to login with a special parameter that will handle logout properly
  window.location.href = '/login?action=logout';
};
