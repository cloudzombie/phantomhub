import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { getToken, storeToken, storeUserData, getUserData, isAuthenticated as checkAuthStatus, clearAuthData } from '../utils/tokenManager';

// Define user interface
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Define auth context interface
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: () => Promise<boolean>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  login: async () => false,
  register: async () => false,
  logout: async () => {},
  isAuthenticated: async () => false,
});

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkUserAuth = async () => {
      console.log('AuthContext: Checking auth status on load/refresh');
      
      // First try to get user from localStorage for immediate UI display
      const storedUser = getUserData();
      const token = getToken();
      
      // If we have a stored user, set it immediately to prevent flashing of login screen
      if (storedUser) {
        try {
          // getUserData already handles parsing and validation, so we can use it directly
          setUser(storedUser);
          console.log('AuthContext: Restored user from storage, role:', storedUser.role);
          
          // Set axios default headers immediately if we have a token
          if (token) {
            console.log('AuthContext: Setting Authorization header from stored token');
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          }
          
          // Always ensure cookies are sent with requests
          axios.defaults.withCredentials = true;
        } catch (err) {
          console.error('AuthContext: Error restoring user from storage', err);
        }
      }
      
      // Now verify authentication with the server (works with HTTP-only cookies)
      try {
        // Make a request to the auth check endpoint
        const isAuth = await checkAuthStatus();
        
        if (!isAuth && !storedUser) {
          console.log('AuthContext: Not authenticated according to server');
          setLoading(false);
          return;
        }
        
        try {
        console.log('AuthContext: Fetching current user data');
        // Ensure credentials are sent with the request (for cookies)
        axios.defaults.withCredentials = true;
        
        // Make the request to get current user data
        const response = await axios.get(`${API_URL}/auth/me`, {
          withCredentials: true,
          timeout: 8000
        });
        
        if (response.data && response.data.success) {
          console.log('AuthContext: Authentication verified successfully');
          // Update user data with latest from server
          const userData = response.data.user;
          setUser(userData);
          
          // Store user data in localStorage for persistence
          storeUserData(userData);
          
          // Set axios default to always include credentials
          axios.defaults.withCredentials = true;
          
          // If we have a token in localStorage, set the Authorization header as fallback
          const token = getToken();
          if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          }
          
          // Import ApiService and ensure socket connection is initialized
          const { ApiService } = await import('../services/ApiService');
          setTimeout(() => {
            console.log('AuthContext: Ensuring socket connection after auth check');
            ApiService.reconnectSocket();
            
            // Dispatch user-authenticated event for other services to listen to
            if (userData && userData.id) {
              document.dispatchEvent(new CustomEvent('user-authenticated', { 
                detail: { userId: userData.id, role: userData.role || 'user' } 
              }));
              console.log('AuthContext: Dispatched user-authenticated event');
            } else {
              console.warn('AuthContext: User data missing ID, cannot dispatch event');
            }
          }, 500); // Small delay to ensure everything is ready
        } else {
          console.error('AuthContext: User validation failed', response.data);
          // Only clear user state if explicitly told by server to logout
          if (response.data.forceLogout) {
            await clearAuthData();
            setUser(null);
          }
        }
      } catch (err) {
        console.error('AuthContext: Error checking auth status:', err);
        
        // CRITICAL: NEVER clear token on ANY errors to prevent logout
        if (axios.isAxiosError(err)) {
          if (err.code === 'ECONNABORTED' || !err.response) {
            console.log('AuthContext: Network error, keeping existing auth state');
            // Keep the existing user state from localStorage to prevent logout on network issues
          } else if (err.response && err.response.status === 401) {
            console.log('AuthContext: Token invalid (401), but keeping credentials to prevent logout');
            // CRITICAL: We're not clearing credentials even on 401 to prevent logout on refresh
            // This is a temporary fix until we can properly debug the issue
          } else {
            console.log('AuthContext: Non-auth error, keeping credentials');
          }
        } else {
          console.log('AuthContext: Unknown error type, keeping credentials');
        }
        
        // If we have a stored user, keep using it despite the error
        const storedUser = localStorage.getItem('user');
        if (storedUser && !user) {
          try {
            console.log('AuthContext: Using stored user despite auth check error');
            setUser(JSON.parse(storedUser));
          } catch (parseErr) {
            console.error('AuthContext: Error parsing stored user after auth error', parseErr);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    
    checkUserAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      console.log('AuthContext: Attempting login for', email);
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });
      
      if (response.data.success) {
        console.log('AuthContext: Login successful');
        // Handle different response formats
        const token = response.data.data?.token || response.data.token;
        const userData = response.data.data?.user || response.data.user;
        
        if (!token || !userData) {
          console.error('AuthContext: Login response missing token or user data', response.data);
          setError('Login successful but missing authentication data');
          return false;
        }
        
        // Use tokenManager utilities for consistent token storage
        storeToken(token);
        storeUserData(userData);
        
        // CRITICAL: Force token into localStorage and sessionStorage for maximum persistence
        localStorage.setItem('token', token);
        sessionStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        sessionStorage.setItem('user', JSON.stringify(userData));
        
        // Set user state
        setUser(userData);
        
        // CRITICAL: Set up axios defaults for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('AuthContext: Set Authorization header for all future requests');
        
        // Import ApiService and initialize socket connection after successful login
        try {
          const { ApiService } = await import('../services/ApiService');
          setTimeout(() => {
            console.log('AuthContext: Initializing socket connection after login');
            ApiService.reconnectSocket();
            
            // Always dispatch user-authenticated event
            document.dispatchEvent(new CustomEvent('user-authenticated', { 
              detail: { userId: userData.id, role: userData.role || 'user' } 
            }));
            console.log('AuthContext: Dispatched user-authenticated event');
            
            // Verify the token is still in localStorage
            const verifyToken = localStorage.getItem('token');
            if (!verifyToken) {
              console.error('AuthContext: Token disappeared from localStorage, restoring');
              localStorage.setItem('token', token);
            }
          }, 100); // Reduced delay for faster response
        } catch (serviceErr) {
          console.error('AuthContext: Error initializing services after login', serviceErr);
          // Continue with login success even if service initialization fails
        }
        
        return true;
      } else {
        console.error('AuthContext: Login failed', response.data.message);
        setError(response.data.message || 'Login failed');
        return false;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
      return false;
    }
  };

  // Register function with enhanced persistence
  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      console.log('AuthContext: Attempting registration for', email);
      const response = await axios.post(`${API_URL}/auth/register`, {
        name,
        email,
        password
      });
      
      if (response.data.success) {
        console.log('AuthContext: Registration successful');
        // Handle different response formats
        const token = response.data.data?.token || response.data.token;
        const userData = response.data.data?.user || response.data.user;
        
        if (!token || !userData) {
          console.error('AuthContext: Registration response missing token or user data', response.data);
          setError('Registration successful but missing authentication data');
          return false;
        }
        
        // Use tokenManager utilities for consistent token storage
        storeToken(token);
        storeUserData(userData);
        
        // CRITICAL: Force token into localStorage and sessionStorage for maximum persistence
        localStorage.setItem('token', token);
        sessionStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        sessionStorage.setItem('user', JSON.stringify(userData));
        
        // Set user state
        setUser(userData);
        
        // CRITICAL: Set up axios defaults for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('AuthContext: Set Authorization header for all future requests after registration');
        
        // Import ApiService and initialize socket connection after successful registration
        try {
          const { ApiService } = await import('../services/ApiService');
          setTimeout(() => {
            console.log('AuthContext: Initializing socket connection after registration');
            ApiService.reconnectSocket();
            
            // Always dispatch user-authenticated event
            document.dispatchEvent(new CustomEvent('user-authenticated', { 
              detail: { userId: userData.id, role: userData.role || 'user' } 
            }));
            console.log('AuthContext: Dispatched user-authenticated event after registration');
          }, 100); // Reduced delay for faster response
        } catch (serviceErr) {
          console.error('AuthContext: Error initializing services after registration', serviceErr);
          // Continue with registration success even if service initialization fails
        }
        
        return true;
      } else {
        console.error('AuthContext: Registration failed', response.data.message);
        setError(response.data.message || 'Registration failed');
        return false;
      }
    } catch (err: any) {
      console.error('AuthContext: Registration error', err);
      setError(err.response?.data?.message || 'Registration failed');
      return false;
    }
  };

  // Logout function - only call this when the user explicitly wants to logout
  const logout = async () => {
    console.log('AuthContext: User explicitly logging out');
    
    // Save any user settings before logout
    try {
      // Import ApiService to use its instance
      import('../services/ApiService').then(module => {
        const apiService = module.default;
        if (apiService && typeof apiService.saveUserSettings === 'function') {
          console.log('AuthContext: Saving user settings before logout');
          apiService.saveUserSettings();
        }
      }).catch(err => {
        console.error('AuthContext: Error importing ApiService', err);
      });
    } catch (error) {
      console.error('AuthContext: Error saving user settings before logout', error);
    }
    
    // Clear user state
    setUser(null);
    
    // Clear all auth data including HTTP-only cookies
    await clearAuthData();
    
    // Dispatch logout event
    document.dispatchEvent(new CustomEvent('user-logged-out'));
    
    // Redirect to login page
    window.location.href = '/login';
  };

  // Check if user is authenticated - more robust implementation that works with HTTP-only cookies
  const isAuthenticated = async (): Promise<boolean> => {
    // First check if we have a user in state
    if (user) {
      console.log('AuthContext: User already in state, authenticated');
      // Ensure credentials are sent with requests
      axios.defaults.withCredentials = true;
      
      // Also set Authorization header if token exists (for backward compatibility)
      const token = getToken();
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      return true;
    }
    
    // If no user in state, check with the server using tokenManager's isAuthenticated
    try {
      // This will check both HTTP-only cookies and localStorage token
      const isAuth = await checkAuthStatus();
      
      if (isAuth) {
        console.log('AuthContext: Server confirmed authentication');
        
        // Try to get user data if available
        const userData = getUserData();
        
        // If we have valid user data but no user state, set the user state
        if (userData && userData.id && !user) {
          console.log('AuthContext: Setting user state from storage in isAuthenticated');
          setUser(userData);
          
          // Dispatch authentication event
          setTimeout(() => {
            document.dispatchEvent(new CustomEvent('user-authenticated', { 
              detail: { userId: userData.id, role: userData.role || 'user' } 
            }));
            console.log('AuthContext: Dispatched user-authenticated event from isAuthenticated');
          }, 100);
        } else {
          // If we don't have user data but we're authenticated, fetch it
          try {
            const response = await axios.get(`${API_URL}/auth/me`, {
              withCredentials: true
            });
            
            if (response.data && response.data.success) {
              const newUserData = response.data.user;
              setUser(newUserData);
              storeUserData(newUserData);
            }
          } catch (err) {
            console.error('AuthContext: Error fetching user data in isAuthenticated', err);
          }
        }
        return true;
      }
    } catch (err) {
      console.error('AuthContext: Error checking authentication status', err);
    }
    
    console.log('AuthContext: Not authenticated according to server');
    return false;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      login, 
      register, 
      logout,
      isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);

export default AuthContext;
