import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiServer, 
  FiCode, 
  FiActivity, 
  FiCheckCircle, 
  FiInfo, 
  FiAlertCircle, 
  FiRefreshCw, 
  FiX,
  FiCheck,
  FiCpu,
  FiZap,
  FiList,
  FiLoader
} from 'react-icons/fi';
import axios from 'axios';
import { Socket } from 'socket.io-client';
import DeviceInfoPanel from '../components/DeviceInfoPanel';
import { getToken } from '../utils/tokenManager';
import { observer } from 'mobx-react-lite';
import { useStores } from '../hooks/useStores';
import { useWebSocket } from '../hooks/useWebSocket';
import { 
  useGetDevicesQuery, 
  useGetPayloadsQuery
} from '../core/apiClient';
import type { Device, Payload } from '../core/apiClient';

const API_URL = 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api';

interface Deployment {
  id: string;
  deviceId: string;
  payloadId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  timestamp: string;
  device?: Device;
  payload?: Payload;
}

interface Stats {
  activeDevices: number;
  totalPayloads: number;
  totalAttacks: number;
  successRate: number;
}

const Dashboard = observer(() => {
  // Use MobX stores
  const { deviceStore } = useStores();
  
  // Use Redux RTK Query
  const { data: devicesData, isLoading: isLoadingDevices } = useGetDevicesQuery();
  const { data: payloadsData, isLoading: isLoadingPayloads } = useGetPayloadsQuery();
  
  // Local state
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [recentDeployments, setRecentDeployments] = useState<Deployment[]>([]);
  const [stats, setStats] = useState<Stats>({
    activeDevices: 0,
    totalPayloads: 0,
    totalAttacks: 0,
    successRate: 0,
  });
  
  // Initialize WebSocket
  const { subscribe } = useWebSocket({ autoConnect: true });
  
  // Calculate stats
  useEffect(() => {
    if (devicesData?.success && payloadsData?.success) {
      const devices = devicesData.data || [];
      const payloads = payloadsData.data || [];
      
      const activeDeviceCount = devices.filter(device => device.status === 'online').length;
      
      setStats({
        activeDevices: activeDeviceCount,
        totalPayloads: payloads.length,
        totalAttacks: recentDeployments.length,
        successRate: recentDeployments.length > 0 
          ? Math.round((recentDeployments.filter(d => d.status === 'completed').length / recentDeployments.length) * 100) 
          : 0
      });
    }
  }, [devicesData, payloadsData, recentDeployments]);
  
  // Subscribe to WebSocket events
  useEffect(() => {
    // Listen for device status changes
    const unsubDeviceStatus = subscribe<{id: string, status: string}>('device_status_changed', data => {
      deviceStore.handleDeviceStatusUpdate(data);
    });
    
    // Listen for new deployments
    const unsubDeployments = subscribe('payload_status_update', () => {
      // Fetch deployments - this would ideally come from another RTK Query hook
      fetchRecentDeployments();
    });
    
    return () => {
      unsubDeviceStatus();
      unsubDeployments();
    };
  }, [deviceStore, subscribe]);
  
  // Placeholder for fetching recent deployments
  const fetchRecentDeployments = async () => {
    // This would normally be a Redux RTK Query hook or MobX action
    // For now, just simulate with empty data
    setRecentDeployments([]);
  };
  
  const isLoading = isLoadingDevices || isLoadingPayloads;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <FiLoader className="animate-spin text-blue-500 mr-2" size={24} />
        <span className="text-slate-300">Loading dashboard data...</span>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-sm text-slate-400">Overview of your O.MG Cable devices and operations</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center mb-3">
            <FiCpu className="text-blue-500 mr-2" size={20} />
            <h2 className="text-lg font-medium text-white">Devices</h2>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold text-white">{deviceStore.allDevices.length}</div>
            <div className="text-sm text-slate-400">
              <span className="text-green-500">{deviceStore.onlineDevices.length}</span> online
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center mb-3">
            <FiList className="text-indigo-500 mr-2" size={20} />
            <h2 className="text-lg font-medium text-white">Payloads</h2>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold text-white">{stats.totalPayloads}</div>
            <div className="text-sm text-slate-400">Total created</div>
          </div>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center mb-3">
            <FiZap className="text-amber-500 mr-2" size={20} />
            <h2 className="text-lg font-medium text-white">Deployments</h2>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold text-white">{stats.totalAttacks}</div>
            <div className="text-sm text-slate-400">Last 30 days</div>
          </div>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center mb-3">
            <FiCheck className="text-green-500 mr-2" size={20} />
            <h2 className="text-lg font-medium text-white">Success Rate</h2>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold text-white">{stats.successRate}%</div>
            <div className="text-sm text-slate-400">Avg. completion</div>
          </div>
        </div>
      </div>
      
      {/* Device List */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <div className="border-b border-slate-700 px-6 py-4">
          <h2 className="text-lg font-medium text-white">Your Devices</h2>
        </div>
        <div className="overflow-x-auto">
          {deviceStore.allDevices.length > 0 ? (
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Last Seen</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {deviceStore.allDevices.map((device: Device) => (
                  <tr key={device.id} className="hover:bg-slate-700/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{device.name}</div>
                      <div className="text-xs text-slate-400">{device.ipAddress}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`h-2.5 w-2.5 rounded-full mr-2 ${
                          device.status === 'online' ? 'bg-green-500' :
                          device.status === 'busy' ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}></div>
                        <span className="text-sm text-slate-300 capitalize">{device.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-slate-700 text-slate-300">
                        {device.connectionType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {device.lastCheckIn ? new Date(device.lastCheckIn).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/devices/${device.id}`}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8">
              <FiServer className="mx-auto text-slate-500 mb-2" size={24} />
              <h3 className="text-lg font-medium text-white">No devices found</h3>
              <p className="text-slate-400 mt-1">Connect a device to get started</p>
              <Link
                to="/devices/new"
                className="inline-flex items-center px-4 py-2 mt-4 bg-blue-500 rounded-md text-white hover:bg-blue-600"
              >
                Add Device
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/payload-editor"
          className="bg-slate-800 border border-slate-700 rounded-lg p-5 hover:bg-slate-700/30"
        >
          <div className="flex items-center mb-3">
            <FiZap className="text-amber-500 mr-2" size={20} />
            <h2 className="text-lg font-medium text-white">Create Payload</h2>
          </div>
          <p className="text-sm text-slate-400">
            Create or edit DuckyScript payloads for your devices
          </p>
        </Link>
        
        <Link
          to="/devices/new"
          className="bg-slate-800 border border-slate-700 rounded-lg p-5 hover:bg-slate-700/30"
        >
          <div className="flex items-center mb-3">
            <FiCpu className="text-blue-500 mr-2" size={20} />
            <h2 className="text-lg font-medium text-white">Add Device</h2>
          </div>
          <p className="text-sm text-slate-400">
            Connect and configure a new O.MG Cable device
          </p>
        </Link>
        
        <Link
          to="/settings"
          className="bg-slate-800 border border-slate-700 rounded-lg p-5 hover:bg-slate-700/30"
        >
          <div className="flex items-center mb-3">
            <FiServer className="text-green-500 mr-2" size={20} />
            <h2 className="text-lg font-medium text-white">View Settings</h2>
          </div>
          <p className="text-sm text-slate-400">
            Configure your account and application settings
          </p>
        </Link>
      </div>
    </div>
  );
});

export default Dashboard; 