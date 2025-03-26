import { useState } from 'react';
import { FiUserPlus, FiShield, FiAlertCircle, FiCheckCircle, FiArrowLeft } from 'react-icons/fi';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API_URL = 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    // Validate form
    if (!name || !email || !password || !confirmPassword) {
      setErrorMessage('All fields are required');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        name,
        email,
        password
      });

      if (response.data && response.data.token) {
        // Store token in localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        setSuccessMessage('Registration successful! Redirecting...');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        setErrorMessage('Invalid response from server');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || 'Registration failed');
      } else {
        setErrorMessage('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div 
        className="bg-slate-800 p-8 rounded-lg shadow-lg w-full max-w-md border border-slate-700"
      >
        <div className="flex justify-center mb-6">
          <div className="flex items-center">
            <FiShield className="text-purple-500 mr-2" size={20} />
            <h1 className="text-2xl font-bold text-white">GHOST<span className="text-purple-500">WIRE</span></h1>
          </div>
        </div>
        
        <h2 className="text-center mb-8 text-xl font-medium text-white">
          Create Account
        </h2>
        
        {errorMessage && (
          <div className="mb-5 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-sm">
            <div className="flex items-center">
              <FiAlertCircle className="mr-2 flex-shrink-0" size={16} />
              <p>{errorMessage}</p>
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-5 p-3 bg-purple-900/20 border border-purple-500/30 rounded text-purple-400 text-sm">
            <div className="flex items-center">
              <FiCheckCircle className="mr-2 flex-shrink-0" size={16} />
              <p>{successMessage}</p>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="relative border border-slate-600 rounded-md">
              <label className="absolute -top-2.5 left-2 px-1 bg-slate-800 text-xs font-medium text-slate-400">
                Full Name
              </label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-transparent text-white text-sm focus:outline-none"
                placeholder="John Doe"
              />
            </div>
            
            <div className="relative border border-slate-600 rounded-md">
              <label className="absolute -top-2.5 left-2 px-1 bg-slate-800 text-xs font-medium text-slate-400">
                Email
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-transparent text-white text-sm focus:outline-none"
                placeholder="john@example.com"
              />
            </div>
            
            <div className="relative border border-slate-600 rounded-md">
              <label className="absolute -top-2.5 left-2 px-1 bg-slate-800 text-xs font-medium text-slate-400">
                Password
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-transparent text-white text-sm focus:outline-none"
                placeholder="********"
              />
            </div>
            
            <div className="relative border border-slate-600 rounded-md">
              <label className="absolute -top-2.5 left-2 px-1 bg-slate-800 text-xs font-medium text-slate-400">
                Confirm Password
              </label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-transparent text-white text-sm focus:outline-none"
                placeholder="********"
              />
            </div>
            
            <button 
              type="submit"
              className="w-full flex items-center justify-center py-2 px-4 bg-purple-500/10 text-purple-500 border border-purple-500/30 rounded hover:bg-purple-500/20 transition-colors mt-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registering...
                </>
              ) : (
                <>
                  <FiUserPlus className="mr-2" size={16} />
                  Create Account
                </>
              )}
            </button>
          </div>
        </form>
        
        <div className="mt-6 text-center">
          <Link 
            to="/login"
            className="text-sm text-slate-400 hover:text-white flex items-center justify-center"
          >
            <FiArrowLeft className="mr-1" size={14} />
            Back to Login
          </Link>
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-700 text-center">
          <p className="text-xs text-slate-500">
            GhostWire © {new Date().getFullYear()} — Advanced Penetration Testing Platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register; 