import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiLogIn, FiShield, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import axios from 'axios';
import { api } from '../services/api';
import ThemeService from '../services/ThemeService';
import NotificationService from '../services/NotificationService';
import { API_URL } from '../config';
import { storeToken, storeUserData } from '../utils/tokenManager';
import { setUser, setToken, logout } from '../store/slices/authSlice';
import { RootState } from '../store';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Check for logout action and handle authentication
  useEffect(() => {
    // Parse URL parameters to check for logout action
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    
    if (action === 'logout' && !isLoggingOut) {
      // Set flag to prevent multiple logout calls
      setIsLoggingOut(true);
      
      // Use Redux logout action
      console.log('Login: Handling logout action from URL parameter');
      dispatch(logout());
      // Clear the URL parameter to prevent repeated logout
      window.history.replaceState({}, document.title, '/login');
      setIsLoggingOut(false);
    } else if (!isLoggingOut && isAuthenticated) {
      // If already authenticated and not logging out, redirect to home
      console.log('Login: User already authenticated, redirecting to home');
      navigate('/');
    }
  }, [isAuthenticated, navigate, dispatch, isLoggingOut]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      console.log('Attempting login with:', { email });
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      }, {
        withCredentials: true, // Important for cookies to be received
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Login response:', response.data);

      if (response.data && response.data.success) {
        const { user } = response.data;
        
        if (!user) {
          console.error('Invalid response format:', response.data);
          setErrorMessage('Invalid response format from server');
          return;
        }

        console.log('Storing user data');
        // Store user data only, token is handled by HTTP-only cookie
        storeUserData(user);
        
        // Update Redux state
        dispatch(setUser(user));
        
        // Reload theme settings for the user
        const currentTheme = ThemeService.getConfig().theme;
        console.log(`Current theme before reload: ${currentTheme}`);
        ThemeService.reloadSettings();
        console.log(`Current theme after reload: ${currentTheme}`);
        
        setSuccessMessage('Login successful! Redirecting...');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        console.error('Login failed:', response.data);
        setErrorMessage(response.data?.message || 'Invalid response from server');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           error.message || 
                           'Invalid email or password';
        console.error('Axios error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: errorMessage
        });
        setErrorMessage(errorMessage);
      } else {
        console.error('Non-axios error:', error);
        setErrorMessage('An unexpected error occurred. Please try again.');
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
          <div className="mb-4 p-3 bg-green-500/5 border border-green-500/20 rounded-lg text-green-400 text-sm">
            <div className="flex items-center">
              <FiCheckCircle className="mr-2 flex-shrink-0" size={16} />
              <p>{successMessage}</p>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter your password"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                Signing in...
              </>
            ) : (
              <>
                <FiLogIn className="mr-2" />
                Sign In
              </>
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