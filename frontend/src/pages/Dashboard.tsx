import { useEffect, useState } from 'react';
import { FiServer, FiCode, FiActivity, FiCheckCircle, FiInfo, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

interface Device {
  id: number;
  name: string;
  ipAddress: string;
  status: string;
  lastCheckIn: string | null;
  firmwareVersion: string;
  createdAt: string;
  updatedAt: string;
}

interface Deployment {
  id: number;
  payloadId: number;
  deviceId: number;
  userId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  result: string | null;
  payload?: {
    id: number;
    name: string;
    description: string;
    script: string;
  };
  device?: {
    id: number;
    name: string;
    ipAddress: string;
    status: string;
  };
  initiator?: {
    id: number;
    username: string;
    email: string;
  };
}

interface Stats {
  activeDevices: number;
  totalPayloads: number;
  totalAttacks: number;
  successRate: number;
}

const Dashboard = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [recentDeployments, setRecentDeployments] = useState<Deployment[]>([]);
  const [stats, setStats] = useState<Stats>({
    activeDevices: 0,
    totalPayloads: 0,
    totalAttacks: 0,
    successRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Connect to WebSocket
    const socket = io(SOCKET_URL);
    
    // Listen for device status changes
    socket.on('device_status_changed', (data) => {
      setDevices(prevDevices => 
        prevDevices.map(device => 
          device.id === data.id 
            ? { ...device, status: data.status } 
            : device
        )
      );
      calculateStats();
    });
    
    // Listen for new deployments
    socket.on('payload_status_update', () => {
      // Update deployments and stats as needed
      fetchData();
    });
    
    // Fetch initial data
    fetchData();
    
    return () => {
      socket.disconnect();
    };
  }, []);
  
  const calculateStats = () => {
    // Calculate stats based on devices and deployments
    const activeDevices = devices.filter(d => d.status === 'online').length;
    const totalPayloads = recentDeployments.length;
    const completedAttacks = recentDeployments.filter(d => d.status === 'completed').length;
    const successRate = totalPayloads > 0 ? Math.round((completedAttacks / totalPayloads) * 100) : 0;
    
    setStats({
      activeDevices,
      totalPayloads,
      totalAttacks: totalPayloads,
      successRate
    });
  };
  
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        window.location.href = '/login';
        return;
      }
      
      const headers = {
        Authorization: `Bearer ${token}`
      };
      
      // Fetch devices
      const devicesResponse = await axios.get(`${API_URL}/devices`, { headers });
      
      if (devicesResponse.data && devicesResponse.data.success) {
        setDevices(devicesResponse.data.data || []);
      }
      
      // Fetch recent deployments
      const deploymentsResponse = await axios.get(`${API_URL}/deployments`, { headers });
      
      if (deploymentsResponse.data && deploymentsResponse.data.success) {
        setRecentDeployments(deploymentsResponse.data.data || []);
      }
      
      // Calculate stats after data is fetched
      setTimeout(() => calculateStats(), 0);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again later.');
      
      // If we get a 401, redirect to login
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Format date/time to be more readable
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Security Dashboard</h1>
        <p className="text-sm text-slate-400">Monitor your penetration testing operations</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-sm">
          <div className="flex items-center">
            <FiAlertCircle className="mr-2 flex-shrink-0" size={16} />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800 border border-slate-700 rounded-md p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs mb-1">Active Devices</p>
              <h3 className="text-2xl font-semibold text-white">{stats.activeDevices}</h3>
            </div>
            <div className="p-2 bg-slate-700 rounded-md">
              <FiServer className="text-green-500" size={18} />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-md p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs mb-1">Total Payloads</p>
              <h3 className="text-2xl font-semibold text-white">{stats.totalPayloads}</h3>
            </div>
            <div className="p-2 bg-slate-700 rounded-md">
              <FiCode className="text-green-500" size={18} />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-md p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs mb-1">Attack Attempts</p>
              <h3 className="text-2xl font-semibold text-white">{stats.totalAttacks}</h3>
            </div>
            <div className="p-2 bg-slate-700 rounded-md">
              <FiActivity className="text-green-500" size={18} />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-md p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs mb-1">Success Rate</p>
              <h3 className="text-2xl font-semibold text-white">{stats.successRate}%</h3>
            </div>
            <div className="p-2 bg-slate-700 rounded-md">
              <FiCheckCircle className="text-green-500" size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Device Status */}
      <div className="bg-slate-800 border border-slate-700 rounded-md shadow-sm mb-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <h2 className="font-medium text-white flex items-center">
            <FiServer className="mr-2 text-green-500" size={16} />
            Device Status
          </h2>
          <span className="text-xs font-medium text-slate-400">
            {devices.filter(d => d.status === 'online').length} Online
          </span>
        </div>
        
        {devices.length === 0 ? (
          <div className="p-6 text-center text-slate-400">
            {isLoading ? (
              <div className="flex justify-center items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500"></div>
              </div>
            ) : (
              <>
                <FiInfo className="mx-auto mb-2" size={20} />
                <p className="text-sm">No devices found. Register O.MG Cables to get started.</p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {devices.map(device => (
              <div key={device.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-700/10">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-3 ${
                    device.status === 'online' ? 'bg-green-500' : 
                    device.status === 'busy' ? 'bg-orange-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <div className="text-sm font-medium text-white">{device.name}</div>
                    <div className="text-xs text-slate-400">Last active: {formatDateTime(device.lastCheckIn)}</div>
                  </div>
                </div>
                <div>
                  {device.status === 'online' ? (
                    <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full">Online</span>
                  ) : device.status === 'busy' ? (
                    <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full">Busy</span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded-full">Offline</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-800 border border-slate-700 rounded-md shadow-sm mb-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <h2 className="font-medium text-white flex items-center">
            <FiActivity className="mr-2 text-green-500" size={16} />
            Recent Activity
          </h2>
          <button 
            onClick={fetchData}
            className="text-xs text-slate-400 hover:text-white flex items-center"
            disabled={isLoading}
          >
            <FiRefreshCw className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} size={12} />
            Refresh
          </button>
        </div>
        
        {recentDeployments.length === 0 ? (
          <div className="p-6 text-center text-slate-400">
            {isLoading ? (
              <div className="flex justify-center items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500"></div>
              </div>
            ) : (
              <>
                <FiInfo className="mx-auto mb-2" size={20} />
                <p className="text-sm">No activity recorded yet. Deploy payloads to see activity here.</p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {recentDeployments.slice(0, 5).map((deployment) => (
              <div key={deployment.id} className="px-4 py-3 hover:bg-slate-700/10">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    {deployment.status === 'completed' ? (
                      <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                        <FiCheckCircle className="text-green-500" size={16} />
                      </div>
                    ) : deployment.status === 'failed' ? (
                      <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                        <FiAlertCircle className="text-red-500" size={16} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                        <FiActivity className="text-orange-500" size={16} />
                      </div>
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white">
                        {deployment.payload?.name || 'Unnamed Payload'}
                      </p>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(deployment.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Deployed to {deployment.device?.name || 'Unknown Device'} by {deployment.initiator?.username || 'Unknown User'}
                    </p>
                    {deployment.status === 'completed' && (
                      <p className="text-xs text-green-400 mt-1">Successfully executed</p>
                    )}
                    {deployment.status === 'failed' && (
                      <p className="text-xs text-red-400 mt-1">Execution failed: {deployment.result || 'Unknown error'}</p>
                    )}
                    {deployment.status === 'pending' && (
                      <p className="text-xs text-orange-400 mt-1">Pending execution</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Getting Started */}
      <div className="bg-slate-800 border border-slate-700 rounded-md p-4 shadow-sm">
        <h3 className="text-sm font-medium text-white flex items-center mb-2">
          <FiInfo className="mr-2 text-green-500" size={16} />
          Getting Started with PhantomHub
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          Connect your O.MG cables via the Devices page and create custom payloads in the Payload Editor. View attack results and captured data in the Results section.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-700/30 border border-slate-600/50 rounded">
            <div className="flex items-center mb-2">
              <FiServer className="text-green-500 mr-1" size={14} />
              <p className="text-xs font-medium text-white">Connect Devices</p>
            </div>
            <p className="text-xs text-slate-400">Register your O.MG cables in the Device Management section.</p>
          </div>
          <div className="p-3 bg-slate-700/30 border border-slate-600/50 rounded">
            <div className="flex items-center mb-2">
              <FiCode className="text-green-500 mr-1" size={14} />
              <p className="text-xs font-medium text-white">Create Payloads</p>
            </div>
            <p className="text-xs text-slate-400">Build and test your attack payloads in the Payload Editor.</p>
          </div>
          <div className="p-3 bg-slate-700/30 border border-slate-600/50 rounded">
            <div className="flex items-center mb-2">
              <FiActivity className="text-green-500 mr-1" size={14} />
              <p className="text-xs font-medium text-white">Monitor Results</p>
            </div>
            <p className="text-xs text-slate-400">View captured data and attack logs in the Results section.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 