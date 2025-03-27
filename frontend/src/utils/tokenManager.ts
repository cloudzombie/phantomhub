/**
 * Token Manager Utility
 * Centralizes token management to prevent accidental token removal
 * This is crucial for maintaining authentication persistence across page refreshes
 * 
 * This implementation ensures token is properly stored both in localStorage/sessionStorage
 * and synchronized with the server database for full persistence
 */

import axios from 'axios';
import apiServiceInstance from '../services/ApiService';

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
 * Safely store the authentication token in both storages and sync with database
 */
export const storeToken = (token: string): void => {
  // Store in both storage mechanisms for redundancy
  localStorage.setItem('token', token);
  sessionStorage.setItem('token', token);
  
  // Set the Authorization header for axios
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  
  // Sync token with backend database for true persistence
  if (token && token.length > 20) {
    // Add a slight delay to ensure the token is properly set in storage first
    setTimeout(() => {
      console.log('TokenManager: Syncing token with database...');
      
      // Call our new /auth/sync-token endpoint
      apiServiceInstance.post('/auth/sync-token', { token })
        .then(response => {
          if (response.data?.success) {
            console.log('TokenManager: Token synced with database successfully');
          } else {
            console.warn('TokenManager: Token sync response indicated failure:', response.data);
          }
        })
        .catch(err => {
          // Critical: Don't remove token on sync errors - just log
          console.warn('TokenManager: Failed to sync token with database', err);
          
          // Retry once after 5 seconds if network or server error
          if (err.code === 'ECONNABORTED' || err.response?.status >= 500) {
            console.log('TokenManager: Will retry token sync in 5 seconds...');
            setTimeout(() => {
              apiServiceInstance.post('/auth/sync-token', { token })
                .then(res => console.log('TokenManager: Retry token sync succeeded'))
                .catch(e => console.warn('TokenManager: Retry token sync failed', e));
            }, 5000);
          }
        });
    }, 500);  // Increased delay for more reliable sequencing
  }
  
  console.log('TokenManager: Token stored and Authorization header set');
};

/**
 * Safely store user data in both storages
 */
export const storeUserData = (userData: any): void => {
  // Validate the userData before storing
  if (!userData || typeof userData !== 'object') {
    console.warn('TokenManager: Invalid user data provided, not storing');
    return;
  }
  
  try {
    // Ensure we have at least the minimum required fields
    const validUserData = {
      id: userData.id || 0,
      role: userData.role || 'user',
      ...(userData)
    };
    
    const userString = JSON.stringify(validUserData);
    localStorage.setItem('user', userString);
    sessionStorage.setItem('user', userString);
    console.log('TokenManager: User data stored successfully');
  } catch (e) {
    console.error('TokenManager: Failed to store user data', e);
  }
};

/**
 * Get user data from storage
 */
export const getUserData = (): any => {
  try {
    // Get stored data with safeguards
    const localUserData = localStorage.getItem('user');
    const sessionUserData = sessionStorage.getItem('user');
    
    // Select which source to use
    let userDataString = localUserData;
    
    // If user data only exists in sessionStorage, restore it to localStorage
    if (!localUserData && sessionUserData) {
      console.log('TokenManager: Restoring user data from sessionStorage to localStorage');
      localStorage.setItem('user', sessionUserData);
      userDataString = sessionUserData;
    }
    
    // Safety check - if no data available, return null
    if (!userDataString) {
      return null;
    }
    
    // Parse the data with validation
    const userData = JSON.parse(userDataString);
    
    // Validate user data has minimum required fields
    if (!userData || typeof userData !== 'object') {
      console.warn('TokenManager: Invalid user data format in storage');
      return null;
    }
    
    // Create a validated user object with defaults for missing properties
    const validatedUser = {
      id: userData.id || 0,
      role: userData.role || 'user',
      ...userData
    };
    
    return validatedUser;
  } catch (error) {
    console.error('TokenManager: Error parsing user data', error);
    // Don't remove anything on error, just return null
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
