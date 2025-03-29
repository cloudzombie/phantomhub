import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { storeUserData, getUserData, clearAuthData, isAuthenticated } from '../utils/tokenManager';
import { WebSocketManager } from '../core/WebSocketManager';

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
  logout: () => Promise<boolean>;
  isAuthenticated: () => Promise<boolean>;
  checkAuthStatus: () => Promise<void>;
}

// Create context with default values
export const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const userData = getUserData();
        if (userData) {
          setUser(userData);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/auth/login`, { email, password }, {
        withCredentials: true
      });

      if (response.data?.success && response.data?.data?.user) {
        const userData = response.data.data.user;
        storeUserData(userData);
        setUser(userData);
        return true;
      }
      return false;
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
            const wsManager = WebSocketManager.getInstance();
            wsManager.connect();
            
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
  const logout = async (): Promise<boolean> => {
    try {
      await axios.post(`${API_URL}/auth/logout`, {}, {
        withCredentials: true
      });
      clearAuthData();
      setUser(null);
      return true;
    } catch (err) {
      console.error('Logout error:', err);
      return false;
    }
  };

  // Check if user is authenticated - more robust implementation that works with HTTP-only cookies
  const isAuthenticated = async (): Promise<boolean> => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        withCredentials: true
      });

      if (response.data?.success && response.data?.data?.user) {
        const userData = response.data.data.user;
        storeUserData(userData);
        setUser(userData);
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  // Check authentication status and update user data
  const checkAuthStatus = async (): Promise<void> => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        withCredentials: true
      });

      if (response.data?.success && response.data?.data?.user) {
        const userData = response.data.data.user;
        storeUserData(userData);
        setUser(userData);
      } else {
        clearAuthData();
        setUser(null);
      }
    } catch (err) {
      clearAuthData();
      setUser(null);
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
      isAuthenticated,
      checkAuthStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Export the useAuth hook
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
