import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import { FiHome, FiServer, FiCode, FiFileText, FiLogOut, FiShield, FiSettings, FiUser, FiUsers, FiLock } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import ApiHealthStatus from './ApiHealthStatus';
import ApiService from '../services/ApiService';
import NotificationService from '../services/NotificationService';
import ThemeService from '../services/ThemeService';
import ThemeToggle from './ui/ThemeToggle';

const Layout = () => {
  const location = useLocation();
  const [activeRoute, setActiveRoute] = useState('/');
  const [currentUser, setCurrentUser] = useState<{name?: string, email?: string, role?: string, id?: string} | null>(null);
  
  useEffect(() => {
    setActiveRoute(location.pathname);
    
    // Get current user from localStorage
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (userStr && userStr !== 'undefined') {
      try {
        const userData = JSON.parse(userStr);
        setCurrentUser(userData);
        
        // Reload theme settings for the current user
        console.log('Layout: User data loaded, reloading theme settings');
        ThemeService.reloadSettings();
        
        // Force save the current theme to ensure it's stored for this user
        setTimeout(() => {
          ThemeService.forceSaveCurrentTheme();
        }, 100); // Short delay to ensure theme is fully applied first
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user'); // Remove invalid user data
      }
    } else if (token) {
      // If we have a token but no valid user data, try to fetch user info
      const fetchUserData = async () => {
        try {
          const response = await axios.get(`${API_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (response.data.success) {
            const userData = response.data.data;
            localStorage.setItem('user', JSON.stringify(userData));
            setCurrentUser(userData);
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      };
      
      fetchUserData();
    }
    
    // Listen for API configuration changes
    const handleApiConfigChange = (event: CustomEvent) => {
      console.log('API configuration updated:', event.detail);
      // The ApiService handles this event internally
    };
    
    // Listen for notification settings changes
    const handleNotificationSettingsChange = (event: CustomEvent) => {
      console.log('Notification settings updated:', event.detail);
      // The NotificationService handles this event internally
    };
    
    // Add event listeners
    document.addEventListener('api-config-changed', handleApiConfigChange as EventListener);
    document.addEventListener('notification-settings-changed', handleNotificationSettingsChange as EventListener);
    
    // Initialize services
    try {
      // Connect to notification service when layout is mounted
      NotificationService.connect();
    } catch (error) {
      console.error('Error initializing services:', error);
    }
    
    // Cleanup
    return () => {
      document.removeEventListener('api-config-changed', handleApiConfigChange as EventListener);
      document.removeEventListener('notification-settings-changed', handleNotificationSettingsChange as EventListener);
      
      // Disconnect from notification service when layout is unmounted
      NotificationService.disconnect();
    };
  }, [location]);
  
  const handleLogout = () => {
    console.log('Layout: User clicked logout button');
    // Instead of directly removing tokens, use the AuthContext's logout method
    // This ensures proper cleanup and prevents accidental logouts
    
    // First, clear user-specific settings
    if (currentUser && currentUser.id) {
      try {
        // Don't remove settings, just save them to API if needed
        console.log('Layout: Saving user settings before logout');
        // ApiService will handle this properly without removing tokens
        ApiService.saveUserSettings();
      } catch (err) {
        console.error('Layout: Error saving settings before logout', err);
      }
    }
    
    // Redirect to the login page, which will handle the actual logout
    // This prevents direct token removal which could cause issues
    window.location.href = '/login?action=logout';
  };
  
  const NavItem = ({ to, icon, children, isActive }: { to: string; icon: React.ReactElement; children: React.ReactNode; isActive?: boolean }) => (
    <RouterLink
      to={to}
      className={`
        flex items-center py-1.5 px-2 my-0.5 transition-all duration-200
        ${activeRoute === to || isActive
          ? 'text-green-500 font-medium bg-slate-800/80'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
        }
      `}
    >
      <span className={`mr-2 flex items-center justify-center ${activeRoute === to || isActive ? 'text-green-500' : 'text-slate-500'}`}>{icon}</span>
      <span className="text-xs">{children}</span>
    </RouterLink>
  );
  
  return (
    <div className="flex min-h-screen bg-slate-900 text-white">
      {/* Sidebar - fixed width, always visible */}
      <aside className="w-[140px] min-w-[140px] bg-slate-800 border-r border-slate-700 overflow-y-auto fixed h-screen z-10 shadow-md">
        {/* Logo */}
        <div className="h-12 flex items-center justify-center border-b border-slate-700 bg-slate-800">
          <div className="flex items-center">
            <FiShield className="text-green-500 mr-1" size={14} />
            <div className="text-xs font-bold tracking-wide">GHOST<span className="text-green-500">WIRE</span></div>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-2">
          <div className="text-[9px] py-1.5 text-slate-500 font-medium text-center tracking-wider uppercase">
            Navigation
          </div>
          
          <div className="space-y-0.5 px-1">
            <NavItem to="/" icon={<FiHome size={14} />} isActive={true}>Dashboard</NavItem>
            <NavItem to="/devices" icon={<FiServer size={14} />}>O.MG Cables</NavItem>
            <NavItem to="/payload-editor" icon={<FiCode size={14} />}>Payload Editor</NavItem>
            <NavItem to="/results" icon={<FiFileText size={14} />}>Results</NavItem>
          </div>
          
          <div className="text-[9px] pt-3 pb-1 text-slate-500 font-medium text-center tracking-wider uppercase">
            System
          </div>
          <div className="space-y-0.5 px-1">
            <NavItem to="/settings" icon={<FiSettings size={14} />}>Settings</NavItem>
            {currentUser && currentUser.role === 'admin' && (
              <>
                <div className="text-[9px] pt-3 pb-1 text-slate-500 font-medium text-center tracking-wider uppercase">
                  Admin
                </div>
                <NavItem to="/admin" icon={<FiLock size={14} />}>Admin Dashboard</NavItem>
                <NavItem to="/admin/users" icon={<FiUsers size={14} />}>User Management</NavItem>
              </>
            )}
          </div>
          
          {/* System Status - replaced with ApiHealthStatus */}
          <div className="p-1 mt-4">
            <ApiHealthStatus />
          </div>
          
          {/* Logout Button */}
          <div className="p-1 mt-3">
            <button 
              onClick={handleLogout}
              className="flex w-full items-center justify-center p-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition-colors"
            >
              <FiLogOut size={14} className="mr-2" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
      
      {/* Main Content - with left margin to accommodate fixed sidebar */}
      <div className="flex-1 ml-[140px]">
        {/* Header */}
        <header className="h-12 bg-slate-800 border-b border-slate-700 px-4 flex items-center justify-between sticky top-0 z-10 shadow-md">
          <div className="flex items-center">
            <div className="text-sm font-medium text-green-500 ml-1 flex items-center">
              <span className="text-white">Mission</span> Control Dashboard
            </div>
          </div>
          <div className="flex items-center">
            <div className="mr-4">
              <ThemeToggle compact={true} showLabels={false} />
            </div>
            <div className="flex items-center py-1 px-2 rounded bg-purple-500/10 border border-purple-500/30">
              <FiUser size={14} className="mr-2 text-purple-500" />
              {currentUser ? (
                <span className="text-xs text-purple-500 font-medium">{currentUser.email || 'User'}</span>
              ) : (
                <span className="text-xs text-slate-400">Not logged in</span>
              )}
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="bg-slate-900">
          <Outlet />
          
          {/* Footer */}
          <footer className="py-2 px-4 border-t border-slate-800/50 text-center text-xs text-slate-500">
            GhostWire © {new Date().getFullYear()} — Advanced Penetration Testing Platform
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Layout; 