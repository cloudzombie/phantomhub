import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLogIn, FiShield, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import axios from 'axios';
import ApiService from '../services/ApiService';
import ThemeService from '../services/ThemeService';
import NotificationService from '../services/NotificationService';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import { storeToken, storeUserData } from '../utils/tokenManager';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Check for logout action and handle authentication
  useEffect(() => {
    // Parse URL parameters to check for logout action
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    
    if (action === 'logout' && !isLoggingOut) {
      // Set flag to prevent multiple logout calls
      setIsLoggingOut(true);
      
      // Use the AuthContext's logout method for proper cleanup
      console.log('Login: Handling logout action from URL parameter');
      logout().finally(() => {
        // Clear the URL parameter to prevent repeated logout
        window.history.replaceState({}, document.title, '/login');
      });
    } else {
      // Check authentication status
      isAuthenticated().then(isAuth => {
        if (isAuth) {
          // If already authenticated and not logging out, redirect to home
          console.log('Login: User already authenticated, redirecting to home');
          navigate('/');
        }
      });
    }
  }, [isAuthenticated, navigate, logout, isLoggingOut]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Clear any previous user's settings to ensure fresh start
      ApiService.clearUserSettings();
      
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      if (response.data && response.data.token) {
        // Use tokenManager utilities for consistent token storage
        const token = response.data.token;
        const userData = response.data.user;
        
        // Store token and user data using tokenManager
        storeToken(token);
        storeUserData(userData);
        
        // CRITICAL: Set axios default headers for all future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        console.log('Login successful, reloading all service settings...');
        
        // Fetch settings from API if available
        try {
          const settingsResponse = await axios.get(`${API_URL}/users/settings`, {
            headers: { Authorization: `Bearer ${response.data.token}` }
          });
          
          if (settingsResponse.data && settingsResponse.data.success) {
            console.log('Successfully loaded user settings from API');
            
            // Save the API-retrieved settings to localStorage
            const userId = response.data.user.id;
            const settingsKey = userId ? `phantomhub_settings_${userId}` : 'phantomhub_settings';
            localStorage.setItem(settingsKey, JSON.stringify(settingsResponse.data.data));
          }
        } catch (settingsError) {
          console.warn('Could not load settings from API, using defaults:', settingsError);
        }
        
        // Reload all service settings
        ApiService.reloadSettings();
        ThemeService.reloadSettings();
        NotificationService.reloadSettings();
        
        // Explicitly verify the theme is loaded
        const currentTheme = ThemeService.getConfig().theme;
        console.log(`Current theme after reload: ${currentTheme}`);
        
        setSuccessMessage('Login successful! Redirecting...');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        setErrorMessage('Invalid response from server');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || 'Invalid email or password');
      } else {
        setErrorMessage('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div 
        className="bg-slate-800/90 backdrop-blur-sm p-8 rounded-lg shadow-xl w-full max-w-md border border-purple-500/20"
      >
        <div className="flex justify-center mb-4">
          <div className="flex items-center bg-slate-900/50 px-4 py-2 rounded-full border border-purple-500/20">
            <FiShield className="text-purple-500 mr-2" size={24} />
            <h1 className="text-2xl font-bold text-white tracking-tight">GHOST<span className="text-purple-500">WIRE</span></h1>
          </div>
        </div>
        <p className="text-center mb-6 text-sm text-slate-400">
          Advanced Penetration Testing Platform
        </p>
        
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-red-400 text-sm">
            <div className="flex items-center">
              <FiAlertCircle className="mr-2 flex-shrink-0" size={16} />
              <p>{errorMessage}</p>
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-4 p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg text-purple-400 text-sm">
            <div className="flex items-center">
              <FiCheckCircle className="mr-2 flex-shrink-0" size={16} />
              <p>{successMessage}</p>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="relative border border-purple-500/20 rounded-lg transition-colors focus-within:border-purple-500/50">
              <label className="absolute -top-2.5 left-2 px-1 bg-slate-800 text-xs font-medium text-slate-400">
                Email
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-transparent text-white text-sm focus:outline-none rounded-lg"
                placeholder="admin@ghostwire.io"
                disabled={isLoading}
              />
            </div>
          </div>
          
          <div className="relative">
            <div className="relative border border-purple-500/20 rounded-lg transition-colors focus-within:border-purple-500/50">
              <label className="absolute -top-2.5 left-2 px-1 bg-slate-800 text-xs font-medium text-slate-400">
                Password
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-transparent text-white text-sm focus:outline-none rounded-lg"
                placeholder="********"
                disabled={isLoading}
              />
            </div>
          </div>
          
          <button 
            type="submit"
            className="w-full flex items-center justify-center py-2.5 px-4 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin h-4 w-4 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-2">Authenticating...</span>
              </div>
            ) : (
              <div className="flex items-center">
                <FiLogIn className="mr-2" size={16} />
                <span>Log In</span>
              </div>
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            Don't have an account?{' '}
            <a href="/register" className="text-purple-400 hover:text-purple-300 transition-colors">
              Sign up
            </a>
          </p>
        </div>
        
        <div className="mt-6 pt-6 border-t border-purple-500/20 text-center">
          <p className="text-xs text-slate-500">
            GhostWire © {new Date().getFullYear()} — Advanced Penetration Testing Platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 