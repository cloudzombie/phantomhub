import React, { useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FiUsers, FiHome, FiSettings, FiShield, FiLogOut } from 'react-icons/fi';

const AdminLayout: React.FC = () => {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
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
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };
  
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
    <div className="admin-layout min-h-screen bg-slate-900">
      {/* Admin Navigation */}
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link to="/admin" className="flex items-center">
                  <FiShield className="h-8 w-8 text-green-500" />
                  <span className="ml-2 text-xl font-bold text-white">Admin Panel</span>
                </Link>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <Link
                    to="/admin"
                    className={`${
                      location.pathname === '/admin'
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    } px-3 py-2 rounded-md text-sm font-medium`}
                  >
                    <FiHome className="inline-block mr-1" />
                    Dashboard
                  </Link>
                  <Link
                    to="/admin/users"
                    className={`${
                      location.pathname === '/admin/users'
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    } px-3 py-2 rounded-md text-sm font-medium`}
                  >
                    <FiUsers className="inline-block mr-1" />
                    User Management
                  </Link>
                  <Link
                    to="/admin/settings"
                    className={`${
                      location.pathname === '/admin/settings'
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    } px-3 py-2 rounded-md text-sm font-medium`}
                  >
                    <FiSettings className="inline-block mr-1" />
                    Settings
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
              >
                <FiLogOut className="mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
