import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import DeviceManagement from './pages/DeviceManagement';
import PayloadEditor from './pages/PayloadEditor';
import ResultsViewer from './pages/ResultsViewer';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import AdminUserManagement from './pages/AdminUserManagement';
import AdminNotFound from './pages/AdminNotFound';
import AdminLayout from './components/admin/AdminLayout';
import { useEffect, useState, useCallback } from 'react';

import { useAuth } from './contexts/AuthContext';

// Protected route component with enhanced authentication checking
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    // Enhanced authentication check that ensures token is properly set
    const checkAuth = async () => {
      console.log('ProtectedRoute: Checking authentication status');
      
      // First check via AuthContext
      const authenticated = isAuthenticated();
      
      // Double-check with tokenManager directly as a fallback
      if (!authenticated) {
        console.log('ProtectedRoute: Not authenticated via AuthContext, checking tokenManager');
        const token = getToken();
        const userData = getUserData();
        
        if (token && userData) {
          console.log('ProtectedRoute: Found valid token and user data via tokenManager');
          // Force token into axios headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          // We'll let the component render since we have valid credentials
          setIsChecking(false);
          return;
        }
      } else {
        console.log('ProtectedRoute: Authenticated via AuthContext');
      }
      
      setIsChecking(false);
    };
    
    checkAuth();
  }, [isAuthenticated, user]);
  
  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark">
        <div className="text-white text-xl">Verifying authentication...</div>
      </div>
    );
  }
  
  // Check authentication after verification is complete
  if (!isAuthenticated() && !getToken()) {
    console.log('ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Import tokenManager utilities
import { getToken, getUserData } from './utils/tokenManager';

// Admin route component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(true);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);
  
  // Enhanced debug logging
  useEffect(() => {
    console.log('AdminRoute - Component mounted/updated');
    console.log('AdminRoute - Auth state:', {
      isAuthenticated: isAuthenticated(),
      user: user?.role,
      loading,
      hasCheckedStorage
    });
    
    // Finish verification process once we have all the data we need
    if (!loading && hasCheckedStorage) {
      setIsVerifyingAdmin(false);
    }
  }, [user, loading, isAuthenticated, hasCheckedStorage]);
  
  // Check for stored user data using tokenManager as a fallback
  useEffect(() => {
    const checkStoredUserRole = (): string | null => {
      try {
        // Use tokenManager utilities for consistent token handling
        const token = getToken();
        const userData = getUserData();
        
        console.log('AdminRoute - Checking storage using tokenManager:', {
          hasToken: !!token,
          hasUserData: !!userData
        });
        
        if (token && userData) {
          console.log('AdminRoute - Found stored user with role:', userData?.role);
          
          // Safety check for valid user object
          if (!userData || !userData.role) {
            console.warn('AdminRoute - Invalid user data in storage, but keeping token');
            return null;
          }
          
          // CRITICAL: Set axios default headers with token
          if (token && !axios.defaults.headers.common['Authorization']) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            console.log('AdminRoute - Set Authorization header from storage');
          }
          
          return userData.role;
        }
      } catch (err) {
        console.error('AdminRoute - Error checking stored user:', err);
        // IMPORTANT: Don't clear tokens or user data on errors
      }
      return null;
    };
    
    // Only run this check once
    if (!hasCheckedStorage && !loading) {
      const role = checkStoredUserRole();
      setHasCheckedStorage(true);
    }
  }, [loading, hasCheckedStorage]);
  
  // If still verifying or loading, show enhanced loading UI
  if (loading || isVerifyingAdmin) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="flex items-center mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mr-3"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Refresh
        </button>
      </div>
    );
  }
  
  // If not authenticated, redirect to login
  if (!isAuthenticated()) {
    console.log('AdminRoute - Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // If user is null but we're authenticated, check storage using tokenManager
  if (!user) {
    console.log('AdminRoute - User is null despite token, checking storage via tokenManager');
    const userData = getUserData();
    const storedRole = userData ? userData.role : null;
    
    if (storedRole === 'admin') {
      console.log('AdminRoute - Found admin role in storage, granting access');
      return <>{children}</>;
    }
    
    console.log('AdminRoute - No valid user found, redirecting to home');
    return <Navigate to="/" replace />;
  }
  
  // Check if user has admin role
  if (user.role !== 'admin') {
    console.log('AdminRoute - User is not admin, redirecting to home');
    return <Navigate to="/" replace />;
  }
  
  console.log('AdminRoute - Access granted to admin route');
  return <>{children}</>;
};

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="devices" element={<DeviceManagement />} />
          <Route path="payload-editor" element={<PayloadEditor />} />
          <Route path="results" element={<ResultsViewer />} />
          <Route path="settings" element={<Settings />} />
          
          {/* Admin routes - structured approach with direct components */}
          <Route path="admin" element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUserManagement />} />
            <Route path="*" element={<AdminNotFound />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
