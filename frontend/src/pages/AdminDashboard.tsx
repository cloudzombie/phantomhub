import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
// Import directly from the absolute path to avoid module resolution issues
import { API_URL } from '../config.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { getToken } from '../utils/tokenManager';

// Component imports
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';

// Types for system stats
interface SystemStats {
  users: {
    total: number;
    roleDistribution: Array<{role: string, count: number}>;
  };
  devices: {
    total: number;
    active: number;
    inactive: number;
  };
  payloads: {
    total: number;
  };
  deployments: {
    total: number;
    recent: number;
    successful: number;
    failed: number;
    successRate: string;
  };
  scripts: {
    total: number;
  };
  system: {
    platform: string;
    arch: string;
    cpus: number;
    totalMemory: number;
    freeMemory: number;
    uptime: number;
    nodeVersion: string;
    hostname: string;
  };
}

// Types for system health
interface SystemHealth {
  status: string;
  version: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    status: string;
    responseTime: number;
  };
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);
  
  // Debug output
  useEffect(() => {
    console.log('AdminDashboard mounted');
    console.log('Current user:', user);
    return () => {
      console.log('AdminDashboard unmounted');
    };
  }, [user]);

  // Fetch system stats
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    console.log('AdminDashboard effect running, user:', user, 'loading:', loading);
    
    // Add exponential backoff retry logic for rate limiting
    const fetchWithRetry = async (url: string, options: any, retries = 3, delay = 2000) => {
      try {
        return await axios.get(url, options);
      } catch (error: any) {
        if (error.response && error.response.status === 429 && retries > 0) {
          console.log(`Rate limited, retrying in ${delay}ms... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchWithRetry(url, options, retries - 1, delay * 2);
        }
        throw error;
      }
    };
    
    const fetchSystemStats = async () => {
      try {
        if (isMounted) setLoading(true);
        const token = getToken();
        
        console.log('Fetching system stats with token:', token ? 'Token exists' : 'No token');
        
        // Use the correct admin endpoint path
        const response = await fetchWithRetry(`${API_URL}/admin/system/stats`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          signal: controller.signal,
          timeout: 15000 // Increased timeout to 15 seconds
        }, 3, 2000);
        
        console.log('System stats response received');
        
        if (response.data.success && isMounted) {
          setSystemStats(response.data.data);
          console.log('System stats loaded successfully');
          // Set loading to false after successful data fetch
          setLoading(false);
        } else if (isMounted) {
          setError('Failed to fetch system statistics: ' + (response.data.message || 'Unknown error'));
          console.error('API error:', response.data);
          // Set loading to false on error
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          if (err.response && err.response.status === 429) {
            console.error('Rate limit exceeded. Please try again later.');
            setError('Rate limit exceeded. Please try again in a few minutes.');
          } else if (err.response && err.response.status === 404) {
            console.error('System stats endpoint not found');
            setError('System statistics endpoint not available. The server may need to be updated.');
          } else {
            console.error('Error fetching system stats:', err);
            setError(err.message || 'Error connecting to the server');
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const fetchSystemHealth = async () => {
      try {
        if (!isMounted) return;
        
        const token = getToken();
        console.log('Fetching system health');
        
        // Use the correct admin endpoint path
        const response = await fetchWithRetry(`${API_URL}/admin/system/health`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          signal: controller.signal,
          timeout: 15000 // Increased timeout to 15 seconds
        }, 3, 2000);
        
        console.log('System health response received');
        
        if (response.data.success && isMounted) {
          setSystemHealth(response.data.data);
          console.log('System health loaded successfully');
        } else if (isMounted) {
          console.error('API error:', response.data);
        }
      } catch (err: any) {
        if (isMounted) {
          if (err.response && err.response.status === 429) {
            console.error('Rate limit exceeded. Please try again later.');
            setError('Rate limit exceeded. Please try again in a few minutes.');
          } else if (err.response && err.response.status === 404) {
            console.error('System health endpoint not found');
            // Don't set error here to avoid showing error message if only health fails but stats succeed
            console.warn('Health endpoint not available. Continuing with limited dashboard functionality.');
          } else {
            console.error('Error fetching system health:', err);
            // Only set error if it's a critical failure
            if (!systemStats) {
              setError(err.message || 'Error connecting to the server');
            }
          }
          // Ensure loading is set to false even if this request fails
          setLoading(false);
        }
      }
    };

    // Set a timeout to prevent infinite loading - increased timeout for better reliability
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false);
        setError('Loading timed out. The server might be unavailable.');
        console.error('Loading timed out after 15 seconds');
      }
    }, 15000);
    
    if (user && user.role === 'admin') {
      fetchSystemStats();
      fetchSystemHealth();
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutId);
      console.log('AdminDashboard data fetching cleanup');
    };
  }, [user]);

  // Toggle maintenance mode
  const handleToggleMaintenance = async () => {
    try {
      const token = getToken(); // Use tokenManager for consistency
      const response = await axios.post(
        `${API_URL}/admin/system/maintenance`,
        { enabled: !maintenanceMode },
        { 
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        setMaintenanceMode(!maintenanceMode);
      }
    } catch (err: any) {
      console.error('Error toggling maintenance mode:', err);
      // Show a more user-friendly error message
      if (err.response && err.response.status === 404) {
        alert('Maintenance mode toggle is not available. The server may need to be updated.');
      } else {
        alert(`Failed to toggle maintenance mode: ${err.message || 'Unknown error'}`);
      }
    }
  };

  // Navigate to user management
  const navigateToUserManagement = () => {
    navigate('/admin/users');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-green-500">Admin Dashboard</h1>
            <p className="text-gray-400 mt-2">Loading system information...</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex items-center mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mr-3"></div>
            <p className="text-gray-400">Loading dashboard data...</p>
          </div>
          <p className="text-gray-400 text-sm mt-4">
            If this takes too long, try <button onClick={() => window.location.reload()} className="text-green-500 underline">refreshing the page</button>
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-green-500">Admin Dashboard</h1>
            <p className="text-gray-400 mt-2">System administration and management</p>
          </div>
          <div className="space-x-4">
            <Button onClick={() => window.location.reload()}>
              Retry Loading Data
            </Button>
          </div>
        </div>
        
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-8" role="alert">
          <p className="font-bold">Error Loading Dashboard</p>
          <p>{error}</p>
          <p className="mt-2 text-sm">This could be due to server maintenance or connectivity issues. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="space-x-4">
          <Button 
            onClick={handleToggleMaintenance}
            variant={maintenanceMode ? "danger" : "secondary"}
          >
            {maintenanceMode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
          </Button>
          <Button onClick={navigateToUserManagement}>
            Manage Users
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <Card className="mb-8 p-6">
          <h2 className="text-2xl font-semibold mb-4">System Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-2">Status</h3>
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full mr-2 ${
                  systemHealth.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="capitalize">{systemHealth.status}</span>
              </div>
              <div className="mt-2">
                <p>Uptime: {Math.floor(systemHealth.uptime / 3600)} hours</p>
                <p>Version: {systemHealth.version}</p>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-2">Memory Usage</h3>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-2">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${systemHealth.memory.percentage}%` }}
                ></div>
              </div>
              <p>{systemHealth.memory.used} MB / {systemHealth.memory.total} MB ({systemHealth.memory.percentage}%)</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-2">Disk Usage</h3>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-2">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${systemHealth.disk.percentage}%` }}
                ></div>
              </div>
              <p>{systemHealth.disk.used} GB / {systemHealth.disk.total} GB ({systemHealth.disk.percentage}%)</p>
            </div>
          </div>
        </Card>
      )}

      {/* System Stats Overview */}
      {systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Users</h2>
            <div className="text-3xl font-bold">{systemStats.users.total}</div>
            <div className="mt-4">
              {systemStats.users.roleDistribution.map((role) => (
                <div key={role.role} className="flex justify-between mt-2">
                  <span className="capitalize">{role.role}</span>
                  <span>{role.count}</span>
                </div>
              ))}
            </div>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Devices</h2>
            <div className="text-3xl font-bold">{systemStats.devices.total}</div>
            <div className="mt-4">
              <div className="flex justify-between mt-2">
                <span>Active</span>
                <span>{systemStats.devices.active}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span>Inactive</span>
                <span>{systemStats.devices.inactive}</span>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Deployments</h2>
            <div className="text-3xl font-bold">{systemStats.deployments.total}</div>
            <div className="mt-4">
              <div className="flex justify-between mt-2">
                <span>Success Rate</span>
                <span>{systemStats.deployments.successRate}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span>Recent (7d)</span>
                <span>{systemStats.deployments.recent}</span>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Resources</h2>
            <div className="mt-4">
              <div className="flex justify-between mt-2">
                <span>Payloads</span>
                <span>{systemStats.payloads.total}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span>Scripts</span>
                <span>{systemStats.scripts.total}</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
