import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import { getToken } from './utils/tokenManager';
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
import { useEffect, useState } from 'react';

// Initialize axios with token if available
// This ensures authentication headers are set before any component renders
const token = getToken();
if (token) {
  console.log('App: Setting global Authorization header on initialization');
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

import { useAuth } from './contexts/AuthContext';

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

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
  
  // Check for stored user data in localStorage as a fallback
  useEffect(() => {
    const checkStoredUserRole = (): string | null => {
      try {
        // Use getToken from tokenManager to get token from either localStorage or sessionStorage
        const token = getToken();
        const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
        
        console.log('AdminRoute - Checking storage:', {
          hasToken: !!token,
          hasStoredUser: !!storedUser
        });
        
        if (token && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          console.log('AdminRoute - Found stored user with role:', parsedUser.role);
          
          // CRITICAL: Set axios default headers with token
          if (token && !axios.defaults.headers.common['Authorization']) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            console.log('AdminRoute - Set Authorization header from storage');
          }
          
          return parsedUser.role;
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
  
  // If user is null but we're authenticated, check localStorage
  if (!user) {
    console.log('AdminRoute - User is null despite token, checking localStorage');
    const storedRole = localStorage.getItem('user') ? 
      JSON.parse(localStorage.getItem('user') || '{}').role : null;
    
    if (storedRole === 'admin') {
      console.log('AdminRoute - Found admin role in localStorage, granting access');
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
