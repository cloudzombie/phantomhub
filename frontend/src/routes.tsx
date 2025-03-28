import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import { useAuth } from './contexts/AuthContext';

// Protected route component with enhanced authentication checking
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Admin route component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
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
        
        {/* Admin routes */}
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
  );
};

export default AppRoutes; 