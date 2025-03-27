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
    // Check localStorage for backward compatibility
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
    // Store in localStorage for backward compatibility
    localStorage.setItem('token', token);
    
    // Set the Authorization header for axios
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Ensure cookies are sent with all requests
    axios.defaults.withCredentials = true;
    
    // Sync the token with the server to ensure HTTP-only cookie is set
    syncTokenWithServer(token).catch(err => {
      console.error('TokenManager: Error syncing token with server:', err);
    });
  } catch (err) {
    console.error('TokenManager: Error storing token:', err);
  }
};

/**
 * Sync token with server to ensure HTTP-only cookie is set
 */
const syncTokenWithServer = async (token: string): Promise<void> => {
  try {
    await axios.post(`${API_URL}/auth/sync-token`, { token }, {
      withCredentials: true // Important for cookies to be received
    });
    console.log('TokenManager: Token synced with server successfully');
  } catch (err) {
    console.error('TokenManager: Failed to sync token with server:', err);
    throw err;
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
export const safeLogout = async (): Promise<void> => {
  // Clear auth data first (including HTTP-only cookies)
  await clearAuthData();
  // Redirect to login with a special parameter that will handle logout properly
  window.location.href = '/login?action=logout';
};

/**
 * Clear all authentication data
 * This now clears both localStorage and HTTP-only cookies
 */
export const clearAuthData = async (): Promise<void> => {
  try {
    // Remove token and user data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear Authorization header
    delete axios.defaults.headers.common['Authorization'];
    
    // Clear HTTP-only cookies by calling the logout endpoint
    try {
      await axios.post(`${API_URL}/auth/logout`, {}, {
        withCredentials: true // Important for cookies to be cleared
      });
      console.log('TokenManager: HTTP-only cookies cleared successfully');
    } catch (logoutErr) {
      console.error('TokenManager: Error clearing HTTP-only cookies:', logoutErr);
      // Continue even if this fails, as we've already cleared localStorage
    }
  } catch (err) {
    console.error('TokenManager: Error clearing auth data:', err);
  }
};
