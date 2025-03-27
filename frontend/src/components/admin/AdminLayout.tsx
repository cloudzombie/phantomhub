import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AdminLayout: React.FC = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Debug logging to help diagnose issues
    console.log('AdminLayout - Mounted');
    console.log('AdminLayout - Auth state:', { 
      isAuthenticated: isAuthenticated(), 
      user: user?.role, 
      loading 
    });
    
    // Verify admin access directly in the layout as a secondary check
    if (!loading && !isAuthenticated()) {
      console.log('AdminLayout - Not authenticated, redirecting to login');
      navigate('/login');
      return;
    }
    
    if (!loading && user && user.role !== 'admin') {
      console.log('AdminLayout - Not admin, redirecting to home');
      navigate('/');
      return;
    }
  }, [user, loading, navigate, isAuthenticated]);
  
  // Show loading state if auth is still being checked
  if (loading) {
    return (
      <div className="admin-layout">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex items-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mr-3"></div>
              <p className="text-gray-600">Verifying admin access...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="admin-layout">
      <div className="p-6 max-w-7xl mx-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
