/**
 * Token Manager Utility
 * Centralizes token management to prevent accidental token removal
 * This is crucial for maintaining authentication persistence across page refreshes
 */

import axios from 'axios';
import { API_URL } from '../config';

// Initialize axios with stored token if available
(function initializeAxiosAuth() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    console.log('TokenManager: Setting Authorization header on initialization');
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
})();

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
  console.log('TokenManager: Token stored and Authorization header set');
  
  // Validate token immediately to ensure it's working
  validateToken(token).catch(err => {
    console.warn('TokenManager: Token validation failed, but keeping token', err);
  });
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
  
  // IMPORTANT: Do not remove tokens here, just log the error
  // This is critical for maintaining authentication persistence
  console.warn('TokenManager: Authentication error occurred but keeping tokens to prevent logout');
  
  // Only redirect if this is a true 401 unauthorized error
  // For network errors or other issues, we'll keep the user logged in
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    // Instead of removing tokens directly, redirect to login with action parameter
    // The login page will handle the logout action properly
    window.location.href = '/login?action=reauth';
  }
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
 * Validate token with the server
 * This is used to check if a token is still valid without removing it
 */
export const validateToken = async (token: string): Promise<boolean> => {
  try {
    const response = await axios.get(`${API_URL}/auth/validate`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data.success === true;
  } catch (error) {
    console.warn('TokenManager: Token validation failed', error);
    return false;
  }
};

/**
 * Safe logout that redirects to login page with proper action parameter
 * This should be used instead of directly manipulating localStorage
 */
export const safeLogout = (): void => {
  // Redirect to login with a special parameter that will handle logout properly
  window.location.href = '/login?action=logout';
};
