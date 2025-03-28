import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { getToken, storeToken, storeUserData, getUserData, isAuthenticated as checkAuthStatus, clearAuthData, safeLogout } from '../utils/tokenManager';
import { apiService } from '../services/ApiService';

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
          
          // Ensure socket connection is initialized
          setTimeout(() => {
            console.log('AuthContext: Ensuring socket connection after auth check');
            if (apiService.getWebSocketManager()) {
              apiService.getWebSocketManager().connect();
            }
            
            if (userData && userData.id) {
              document.dispatchEvent(new CustomEvent('user-authenticated', { 
                detail: { userId: userData.id, role: userData.role || 'user' } 
              }));
              console.log('AuthContext: Dispatched user-authenticated event');
            }
          }, 500);
          
          // Reconnect socket if disconnected
          if (!apiService.getWebSocketManager().isConnected()) {
            console.log('AuthContext: Reconnecting socket after successful login');
            apiService.getWebSocketManager().connect();
          }
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
          } else if (err.response && err.response.status === 401) {
            console.log('AuthContext: Token invalid (401), but keeping credentials to prevent logout');
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
      }, {
        withCredentials: true // Ensure cookies are sent/received
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
        
        // Extra precaution to ensure token is saved correctly 
        localStorage.setItem('token', token);
        sessionStorage.setItem('token', token);
        
        // Store user data in both storages
        localStorage.setItem('user', JSON.stringify(userData));
        sessionStorage.setItem('user', JSON.stringify(userData));
        
        // Set user state
        setUser(userData);
        
        // Set up axios defaults for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        axios.defaults.withCredentials = true;
        
        console.log('AuthContext: Authentication set up successfully');
        
        // Force a check to verify authentication worked
        setTimeout(async () => {
          try {
            const verifyResponse = await axios.get(`${API_URL}/auth/check`, {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true
            });
            console.log('Authentication verification result:', verifyResponse.data);
          } catch (err) {
            console.error('Authentication verification failed:', err);
          }
        }, 500);
        
        return true;
      } else {
        console.error('AuthContext: Login failed', response.data);
        setError(response.data.message || 'Login failed');
        return false;
      }
    } catch (err: any) {
      console.error('AuthContext: Login error', err);
      setError(
        err.response?.data?.message ||
        'Login failed. Please check your credentials and try again.'
      );
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
          setTimeout(() => {
            console.log('AuthContext: Initializing socket connection after registration');
            if (apiService.getWebSocketManager()) {
              apiService.getWebSocketManager().connect();
            }
            
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
    try {
      // Use the safeLogout function which handles both clearing data and redirection
      await safeLogout();
    } catch (error) {
      console.error('AuthContext: Error during logout:', error);
      // Even if there's an error, force a redirect to login
      window.location.replace('/login?action=logout');
    }
  };

  // Check if user is authenticated - more robust implementation that works with HTTP-only cookies
  const isAuthenticated = async (): Promise<boolean> => {
    try {
      const token = getToken();
      if (!token) {
        return false;
      }

      // Set axios headers for the check
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.defaults.withCredentials = true;

      // Make a request to verify the token
      const response = await axios.get(`${API_URL}/auth/check`, {
        withCredentials: true,
        timeout: 5000
      });

      return response.data.success;
    } catch (error) {
      console.error('AuthContext: Error checking authentication:', error);
      return false;
    }
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
