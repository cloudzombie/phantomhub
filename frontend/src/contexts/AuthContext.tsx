import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

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
  logout: () => void;
  isAuthenticated: () => boolean;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  login: async () => false,
  register: async () => false,
  logout: () => {},
  isAuthenticated: () => false,
});

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log('AuthContext: Checking auth status on load/refresh');
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      // If we have a stored user, set it immediately to prevent flashing of login screen
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          console.log('AuthContext: Restored user from localStorage', parsedUser.role);
        } catch (err) {
          console.error('AuthContext: Error parsing stored user', err);
        }
      }
      
      if (!token) {
        console.log('AuthContext: No token found');
        setLoading(false);
        return;
      }
      
      try {
        console.log('AuthContext: Verifying token with backend');
        const response = await axios.get(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          // Add timeout to prevent hanging requests
          timeout: 8000
        });
        
        if (response.data.success) {
          console.log('AuthContext: Token verified successfully');
          // Update user data with latest from server
          setUser(response.data.data);
          localStorage.setItem('user', JSON.stringify(response.data.data));
          
          // Set axios default headers for all future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Import ApiService and ensure socket connection is initialized
          const { ApiService } = await import('../services/ApiService');
          setTimeout(() => {
            console.log('AuthContext: Ensuring socket connection after auth check');
            ApiService.reconnectSocket();
            
            // Dispatch user-authenticated event for other services to listen to
            document.dispatchEvent(new CustomEvent('user-authenticated'));
          }, 500); // Small delay to ensure everything is ready
        } else {
          console.error('AuthContext: Token validation failed', response.data);
          // Clear invalid token
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } catch (err) {
        console.error('AuthContext: Error checking auth status:', err);
        
        // Don't clear token on network errors - this prevents logout on temporary connectivity issues
        if (axios.isAxiosError(err) && (err.code === 'ECONNABORTED' || !err.response)) {
          console.log('AuthContext: Network error, keeping existing auth state');
          // Keep the existing user state from localStorage to prevent logout on network issues
        } else {
          // Only clear token for actual auth errors (401, 403)
          console.log('AuthContext: Auth error, clearing credentials');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });
      
      // Set up axios defaults for future requests
      if (response.data.success) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`;
      }
      
      if (response.data.success) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        setUser(response.data.data.user);
        
        // Import ApiService and initialize socket connection after successful login
        const { ApiService } = await import('../services/ApiService');
        setTimeout(() => {
          console.log('AuthContext: Initializing socket connection after login');
          ApiService.reconnectSocket();
          
          // Dispatch user-authenticated event for other services to listen to
          document.dispatchEvent(new CustomEvent('user-authenticated'));
        }, 500); // Small delay to ensure token is stored before socket init
        
        return true;
      } else {
        setError(response.data.message || 'Login failed');
        return false;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
      return false;
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        name,
        email,
        password
      });
      
      if (response.data.success) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        setUser(response.data.data.user);
        return true;
      } else {
        setError(response.data.message || 'Registration failed');
        return false;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
      return false;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Check if user is authenticated
  const isAuthenticated = (): boolean => {
    // Check for token in localStorage
    const hasToken = localStorage.getItem('token') !== null;
    console.log('isAuthenticated check - hasToken:', hasToken);
    return hasToken;
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
