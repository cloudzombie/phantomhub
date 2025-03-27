import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
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
  
  // Debug logging
  console.log('AdminRoute - Checking authentication');
  console.log('AdminRoute - isAuthenticated:', isAuthenticated());
  console.log('AdminRoute - user:', user);
  console.log('AdminRoute - user role:', user?.role);
  console.log('AdminRoute - auth loading:', loading);
  
  // Check for stored user data in localStorage as a fallback
  const checkStoredUserRole = (): string | null => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        console.log('AdminRoute - Found stored user with role:', parsedUser.role);
        return parsedUser.role;
      }
    } catch (err) {
      console.error('AdminRoute - Error checking stored user:', err);
    }
    return null;
  };
  
  // If not authenticated, redirect to login
  if (!isAuthenticated()) {
    console.log('AdminRoute - Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // If auth is still loading, show loading spinner
  if (loading) {
    console.log('AdminRoute - Auth is still loading');
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      <p className="ml-3 text-gray-600">Verifying admin access...</p>
    </div>;
  }
  
  // If user is null but we're authenticated, check localStorage
  if (!user) {
    console.log('AdminRoute - User is null despite token, checking localStorage');
    const storedRole = checkStoredUserRole();
    
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
          
          {/* Admin routes - structured approach */}
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
