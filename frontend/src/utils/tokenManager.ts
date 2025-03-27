/**
 * Token Manager Utility
 * Centralizes token management to prevent accidental token removal
 * This is crucial for maintaining authentication persistence across page refreshes
 * 
 * This implementation ensures token is properly stored both in localStorage/sessionStorage
 * and synchronized with the server database for full persistence
 */

import axios from 'axios';
// Remove ApiService import to fix circular dependency

/**
 * Get the authentication token from storage with enhanced reliability
 * Checks both localStorage and sessionStorage for redundancy
 * Implements multiple fallback mechanisms to ensure token persistence
 */
export const getToken = (): string | null => {
  let token: string | null = null;
  
  try {
    // Try localStorage first
    const localToken = localStorage.getItem('token');
    const sessionToken = sessionStorage.getItem('token');
    
    // If token exists in either storage, use it
    token = localToken || sessionToken || null;
    
    // If token only exists in sessionStorage, restore it to localStorage
    if (!localToken && sessionToken) {
      console.log('TokenManager: Restoring token from sessionStorage to localStorage');
      try {
        localStorage.setItem('token', sessionToken);
      } catch (err) {
        console.warn('TokenManager: Failed to restore token to localStorage:', err);
        // Continue execution - we still have the token from sessionStorage
      }
    }
    
    // If token only exists in localStorage, restore it to sessionStorage
    if (localToken && !sessionToken) {
      console.log('TokenManager: Restoring token from localStorage to sessionStorage');
      try {
        sessionStorage.setItem('token', localToken);
      } catch (err) {
        console.warn('TokenManager: Failed to restore token to sessionStorage:', err);
        // Continue execution - we still have the token from localStorage
      }
    }
    
    // If we found a token, ALWAYS ensure axios headers are set
    if (token) {
      // CRITICAL: Always set the Authorization header, even if it might already exist
      // This ensures the header is always present for API requests
      console.log('TokenManager: Setting Authorization header in getToken');
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Force token into localStorage and sessionStorage
      try {
        localStorage.setItem('token', token);
        sessionStorage.setItem('token', token);
      } catch (err) {
        console.warn('TokenManager: Error ensuring token in storage:', err);
      }
    }
  } catch (err) {
    console.error('TokenManager: Error retrieving token from storage:', err);
    // Don't throw error - return null instead
  }
  
  return token;
};

/**
 * Safely store the authentication token in both storages and sync with database
 * Enhanced for maximum persistence across page refreshes and Heroku deployments
 */
export const storeToken = (token: string): void => {
  if (!token) {
    console.warn('TokenManager: Attempted to store empty token, ignoring');
    return;
  }

  console.log('TokenManager: Storing token with enhanced persistence...');
  
  // Store in both storage mechanisms for redundancy
  try {
    localStorage.setItem('token', token);
    sessionStorage.setItem('token', token);
    
    // Verify token was stored correctly
    const localToken = localStorage.getItem('token');
    const sessionToken = sessionStorage.getItem('token');
    
    if (!localToken) {
      console.warn('TokenManager: Failed to store token in localStorage, retrying...');
      // Try again with a different approach
      window.localStorage.setItem('token', token);
    }
    
    if (!sessionToken) {
      console.warn('TokenManager: Failed to store token in sessionStorage, retrying...');
      window.sessionStorage.setItem('token', token);
    }
  } catch (err) {
    console.error('TokenManager: Error storing token in browser storage:', err);
    // Continue execution - don't let storage errors prevent setting the header
  }
  
  // CRITICAL: Set the Authorization header for axios - this is essential for Heroku deployment
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  
  // Force a synchronous token verification to ensure it's properly set
  try {
    const verifyToken = localStorage.getItem('token');
    if (verifyToken !== token) {
      console.warn('TokenManager: Token verification failed, forcing token into storage');
      localStorage.setItem('token', token);
      sessionStorage.setItem('token', token);
    }
  } catch (err) {
    console.error('TokenManager: Error during token verification:', err);
  }
  
  // Token sync with backend - use direct axios to avoid circular dependency
  // This is essential for maintaining session state on Heroku
  if (token && token.length > 20) {
    console.log('TokenManager: Syncing token with database...');
    
    // Use direct axios call instead of ApiService to avoid circular dependency
    // Always use the Heroku URL as specified in the application configuration
    const apiUrl = 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api';
    
    // Set the Authorization header globally before making the request
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Make the request with explicit headers as well for redundancy
    axios.post(`${apiUrl}/auth/sync-token`, { token }, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(() => {
      console.log('TokenManager: Token synced with database successfully');
      
      // Double-check token still exists in storage after sync
      const verifyToken = localStorage.getItem('token');
      if (!verifyToken) {
        console.warn('TokenManager: Token disappeared from localStorage after sync, restoring');
        localStorage.setItem('token', token);
        sessionStorage.setItem('token', token);
      }
    })
    .catch(() => {
      // Non-critical operation, just log error - don't remove token
      console.warn('TokenManager: Failed to sync token with database');
    });
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
    if (!userDataString || userDataString === 'undefined' || userDataString === 'null') {
      console.log('TokenManager: No valid user data found in storage');
      return null;
    }
    
    try {
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
    } catch (parseError) {
      console.error('TokenManager: Error parsing user data JSON', parseError);
      return null;
    }
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
