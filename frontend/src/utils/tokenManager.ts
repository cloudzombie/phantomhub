/**
 * Token Manager Utility
 * Centralizes token management to handle both HTTP-only cookies and localStorage
 * This is crucial for maintaining authentication persistence across page refreshes
 * 
 * The system now uses HTTP-only cookies as the primary authentication method
 * with localStorage as a fallback for backward compatibility
 */

import axios from 'axios';
import { API_URL } from '../config';

/**
 * Get the authentication token from storage
 * With HTTP-only cookies, the token is automatically sent with requests
 * This function now primarily checks localStorage for backward compatibility
 */
export const getToken = (): string | null => {
  try {
    // Try to get token from localStorage first
    let token = localStorage.getItem('token');
    
    // Then try sessionStorage as a backup
    if (!token) {
      token = sessionStorage.getItem('token');
      // If found in sessionStorage but not localStorage, sync it
      if (token) {
        localStorage.setItem('token', token);
        console.log('TokenManager: Synced token from sessionStorage to localStorage');
      }
    }
    
    if (token) {
      // Always ensure axios header is set
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Ensure cookies are sent with all requests
      axios.defaults.withCredentials = true;
    }
    
    return token;
  } catch (err) {
    console.error('TokenManager: Error retrieving token:', err);
    return null;
  }
};

/**
 * Check if the user is authenticated
 * This now works with both HTTP-only cookies and localStorage
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    // Try to access a protected endpoint to verify authentication
    // This will work with HTTP-only cookies even if localStorage is empty
    const response = await axios.get(`${API_URL}/auth/check`, {
      withCredentials: true // Important for cookies to be sent
    });
    
    return response.data.success === true;
  } catch (err) {
    // If the request fails, the user is not authenticated
    return false;
  }
};

/**
 * Store the authentication token
 * With HTTP-only cookies, the server sets the cookie
 * We still store in localStorage for backward compatibility
 */
export const storeToken = (token: string): void => {
  if (!token) {
    console.warn('TokenManager: Attempted to store empty token, ignoring');
    return;
  }

  try {
    // Store in both localStorage and sessionStorage for redundancy
    localStorage.setItem('token', token);
    sessionStorage.setItem('token', token);
    console.log('TokenManager: Token stored in both localStorage and sessionStorage');
    
    // Set the Authorization header for axios
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Ensure cookies are sent with all requests
    axios.defaults.withCredentials = true;
  } catch (err) {
    console.error('TokenManager: Error storing token:', err);
  }
};

/**
 * Store user data
 */
export const storeUserData = (userData: any): void => {
  try {
    localStorage.setItem('userData', JSON.stringify(userData));
    sessionStorage.setItem('userData', JSON.stringify(userData));
    console.log('TokenManager: User data stored');
  } catch (err) {
    console.error('TokenManager: Error storing user data:', err);
  }
};

/**
 * Get user data
 */
export const getUserData = (): any => {
  try {
    const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  } catch (err) {
    console.error('TokenManager: Error retrieving user data:', err);
    return null;
  }
};

/**
 * Handle authentication errors
 */
export const handleAuthError = (error: any): void => {
  if (error.response?.status === 401) {
    clearAuthData();
    window.location.href = '/login';
  }
};

/**
 * Check if an error is an authentication error
 */
export const isAuthError = (error: any): boolean => {
  return error.response?.status === 401;
};

/**
 * Clear all authentication data
 */
export const clearAuthData = (): void => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userData');
    
    // Clear axios headers
    delete axios.defaults.headers.common['Authorization'];
    axios.defaults.withCredentials = false;
    
    console.log('TokenManager: All auth data cleared');
  } catch (err) {
    console.error('TokenManager: Error clearing auth data:', err);
  }
};

/**
 * Safe logout that redirects to login page with proper action parameter
 * This should be used instead of directly manipulating localStorage
 */
export const safeLogout = async (): Promise<void> => {
  // Clear auth data first (including HTTP-only cookies)
  await clearAuthData();
  
  // Force a hard redirect to login page
  window.location.replace('/login?action=logout');
};
