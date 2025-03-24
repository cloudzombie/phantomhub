import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import { FiHome, FiServer, FiCode, FiFileText, FiLogOut, FiShield, FiSettings } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import ApiHealthStatus from './ApiHealthStatus';

const Layout = () => {
  const location = useLocation();
  const [activeRoute, setActiveRoute] = useState('/');
  
  useEffect(() => {
    setActiveRoute(location.pathname);
  }, [location]);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
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
            <div className="text-xs font-bold tracking-wide">PHANTOM<span className="text-green-500">HUB</span></div>
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
            <div className="text-xs text-slate-400 py-1 px-2 bg-slate-700/50 rounded border border-slate-600/50">
              <span className="text-green-500 font-medium">admin</span>@phantomhub.io
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="bg-slate-900">
          <Outlet />
          
          {/* Footer */}
          <footer className="py-2 px-4 border-t border-slate-800/50 text-center text-xs text-slate-500">
            PhantomHub © {new Date().getFullYear()} — Advanced Penetration Testing Platform
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Layout; 