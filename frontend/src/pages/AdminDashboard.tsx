import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';

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
    const fetchSystemStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/admin/system/stats`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.data.success) {
          setSystemStats(response.data.data);
        } else {
          setError('Failed to fetch system statistics');
        }
      } catch (err) {
        setError('Error connecting to the server');
        console.error('Error fetching system stats:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchSystemHealth = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/admin/system/health`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.data.success) {
          setSystemHealth(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching system health:', err);
      }
    };

    if (user && user.role === 'admin') {
      fetchSystemStats();
      fetchSystemHealth();
    }
  }, [user]);

  // Toggle maintenance mode
  const handleToggleMaintenance = async () => {
    try {
      const token = localStorage.getItem('token');
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
    } catch (err) {
      console.error('Error toggling maintenance mode:', err);
    }
  };

  // Navigate to user management
  const navigateToUserManagement = () => {
    navigate('/admin/users');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 text-xl">{error}</div>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
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
