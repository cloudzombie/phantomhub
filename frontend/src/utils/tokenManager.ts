/**
 * Token Manager Utility
 * Centralizes token management to handle HTTP-only cookies
 */

import axios from 'axios';
import { API_URL } from '../config';

/**
 * Check if the user is authenticated
 * This works with HTTP-only cookies
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    // Try to access a protected endpoint to verify authentication
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
export const clearAuthData = async (): Promise<void> => {
  try {
    // Clear user data from storage
    localStorage.removeItem('userData');
    sessionStorage.removeItem('userData');
    
    // Clear HTTP-only cookie by calling logout endpoint
    try {
      await axios.post(`${API_URL}/auth/logout`, {}, {
        withCredentials: true
      });
    } catch (err) {
      console.error('TokenManager: Error clearing HTTP-only cookie:', err);
    }
    
    console.log('TokenManager: All auth data cleared');
  } catch (err) {
    console.error('TokenManager: Error clearing auth data:', err);
  }
};

/**
 * Safe logout that redirects to login page with proper action parameter
 */
export const safeLogout = async (): Promise<void> => {
  // Clear auth data first (including HTTP-only cookies)
  await clearAuthData();
  
  // Force a hard redirect to login page
  window.location.replace('/login?action=logout');
};
