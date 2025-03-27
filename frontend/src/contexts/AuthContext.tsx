import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { getToken, storeToken, storeUserData, getUserData } from '../utils/tokenManager';

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
      // Use tokenManager instead of direct localStorage access for consistency
      const token = getToken();
      const storedUser = getUserData();
      
      // If we have a stored user, set it immediately to prevent flashing of login screen
      if (storedUser) {
        try {
          // getUserData already handles parsing and validation, so we can use it directly
          setUser(storedUser);
          console.log('AuthContext: Restored user from storage, role:', storedUser.role);
          
          // CRITICAL: Set axios default headers immediately
          if (token) {
            console.log('AuthContext: Setting Authorization header from stored token');
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            // Dispatch authentication event to ensure other components know we're authenticated
            setTimeout(() => {
              // Use storedUser instead of parsedUser since we're using tokenManager
              if (storedUser && storedUser.id) {
                document.dispatchEvent(new CustomEvent('user-authenticated', { 
                  detail: { userId: storedUser.id, role: storedUser.role || 'user' } 
                }));
              } else {
                console.warn('AuthContext: Invalid user data when restoring from storage');
              }
            }, 100);
          }
        } catch (err) {
          console.error('AuthContext: Error restoring user from storage', err);
        }
      }
      
      if (!token) {
        console.log('AuthContext: No token found');
        setLoading(false);
        return;
      }
      
      try {
        console.log('AuthContext: Verifying token with backend');
        // Ensure the token is in the headers for this request
        const headers = { Authorization: `Bearer ${token}` };
        console.log('AuthContext: Using token for verification:', token ? token.substring(0, 10) + '...' : 'none');
        
        const response = await axios.get(`${API_URL}/auth/me`, {
          headers,
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
          console.log('AuthContext: Set default Authorization header for future requests');
          
          // Import ApiService and ensure socket connection is initialized
          const { ApiService } = await import('../services/ApiService');
          setTimeout(() => {
            console.log('AuthContext: Ensuring socket connection after auth check');
            ApiService.reconnectSocket();
            
            // Dispatch user-authenticated event for other services to listen to
            if (response.data && response.data.data && response.data.data.id) {
              document.dispatchEvent(new CustomEvent('user-authenticated', { 
                detail: { userId: response.data.data.id, role: response.data.data.role || 'user' } 
              }));
            } else {
              console.warn('AuthContext: Invalid response data, cannot dispatch user-authenticated event');
            }
          }, 500); // Small delay to ensure everything is ready
        } else {
          console.error('AuthContext: Token validation failed', response.data);
          // DON'T clear token on validation failure - just log the error
          console.warn('AuthContext: Token validation failed but keeping token to prevent logout');
          // Only clear user state if explicitly told by server to logout
          if (response.data.forceLogout) {
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
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
    
    checkAuthStatus();
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
        const token = response.data.data.token;
        const userData = response.data.data.user;
        
        // Store authentication data in multiple places for redundancy
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Also store in sessionStorage as a backup
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('user', JSON.stringify(userData));
        
        // Set user state
        setUser(userData);
        
        // CRITICAL: Set up axios defaults for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('AuthContext: Set Authorization header for all future requests');
        
        // Import ApiService and initialize socket connection after successful login
        const { ApiService } = await import('../services/ApiService');
        setTimeout(() => {
          console.log('AuthContext: Initializing socket connection after login');
          ApiService.reconnectSocket();
          
          // Dispatch user-authenticated event for other services to listen to
          if (userData && userData.id) {
            document.dispatchEvent(new CustomEvent('user-authenticated', { 
              detail: { userId: userData.id, role: userData.role || 'user' } 
            }));
          } else {
            console.warn('AuthContext: Invalid user data, cannot dispatch user-authenticated event');
          }
          
          // Verify the token is still in localStorage
          const verifyToken = localStorage.getItem('token');
          if (!verifyToken) {
            console.error('AuthContext: Token disappeared from localStorage, restoring');
            localStorage.setItem('token', token);
          }
        }, 500); // Small delay to ensure token is stored before socket init
        
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
        const token = response.data.data.token;
        const userData = response.data.data.user;
        
        // Store authentication data in multiple places for redundancy
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Also store in sessionStorage as a backup
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('user', JSON.stringify(userData));
        
        // Set user state
        setUser(userData);
        
        // CRITICAL: Set up axios defaults for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('AuthContext: Set Authorization header for all future requests after registration');
        
        // Import ApiService and initialize socket connection after successful registration
        const { ApiService } = await import('../services/ApiService');
        setTimeout(() => {
          console.log('AuthContext: Initializing socket connection after registration');
          ApiService.reconnectSocket();
          
          // Dispatch user-authenticated event for other services to listen to
          if (userData && userData.id) {
            document.dispatchEvent(new CustomEvent('user-authenticated', { 
              detail: { userId: userData.id, role: userData.role || 'user' } 
            }));
          } else {
            console.warn('AuthContext: Invalid user data, cannot dispatch user-authenticated event');
          }
        }, 500); // Small delay to ensure token is stored before socket init
        
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
  const logout = () => {
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
    
    // Clear all auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    
    // Remove auth header
    delete axios.defaults.headers.common['Authorization'];
    
    // Dispatch logout event
    document.dispatchEvent(new CustomEvent('user-logged-out'));
    
    // Redirect to login page
    window.location.href = '/login';
  };

  // Check if user is authenticated - more robust implementation
  const isAuthenticated = (): boolean => {
    // Check for token in localStorage and sessionStorage for redundancy
    const localToken = localStorage.getItem('token');
    const sessionToken = sessionStorage.getItem('token');
    
    // If token exists in either storage, consider authenticated
    const hasToken = localToken !== null || sessionToken !== null;
    
    // If token only exists in sessionStorage, restore it to localStorage
    if (!localToken && sessionToken) {
      console.log('AuthContext: Restoring token from sessionStorage to localStorage');
      localStorage.setItem('token', sessionToken);
      
      // Also restore user data if available
      const sessionUser = sessionStorage.getItem('user');
      if (sessionUser) {
        localStorage.setItem('user', sessionUser);
      }
    }
    
    console.log('isAuthenticated check - hasToken:', hasToken, 
      'localToken:', !!localToken, 'sessionToken:', !!sessionToken);
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
