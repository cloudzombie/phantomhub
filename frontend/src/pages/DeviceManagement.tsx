import { useState, useEffect } from 'react';
import { FiPlus, FiRefreshCw, FiInfo, FiServer, FiAlertCircle, FiCheck, FiX } from 'react-icons/fi';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface Device {
  id: number;
  name: string;
  ipAddress: string;
  firmwareVersion: string | null;
  status: 'online' | 'offline' | 'busy';
  lastCheckIn: string | null;
  createdAt: string;
  updatedAt: string;
}

const DeviceManagement = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    ipAddress: '',
    firmwareVersion: ''
  });
  
  useEffect(() => {
    fetchDevices();
  }, []);
  
  // Clear messages after 5 seconds
  useEffect(() => {
    if (errorMessage || successMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage, successMessage]);
  
  const fetchDevices = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        window.location.href = '/login';
        return;
      }
      
      const response = await axios.get(`${API_URL}/devices`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        setDevices(response.data.data || []);
      } else {
        setDevices([]);
        setErrorMessage('Failed to fetch devices. Invalid response format.');
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      setErrorMessage('Failed to fetch O.MG Cables. Please check your connection.');
      setDevices([]);
      
      // If we get a 401, redirect to login
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const validateForm = () => {
    if (!formData.name.trim()) {
      setErrorMessage('Cable name is required');
      return false;
    }
    
    if (!formData.ipAddress.trim()) {
      setErrorMessage('IP address is required');
      return false;
    }
    
    // Basic IP address validation
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(formData.ipAddress)) {
      setErrorMessage('Please enter a valid IP address (e.g., 192.168.1.100)');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async () => {
    setErrorMessage(null);
    
    if (!validateForm()) return;
    
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        window.location.href = '/login';
        return;
      }
      
      const deviceData = {
        ...formData,
        status: 'offline' // Default status for new devices
      };
      
      const response = await axios.post(`${API_URL}/devices`, deviceData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        setSuccessMessage('O.MG Cable registered successfully');
        
        // Reset form and close modal
        setFormData({
          name: '',
          ipAddress: '',
          firmwareVersion: ''
        });
        setIsModalOpen(false);
        
        // Refresh device list
        fetchDevices();
      } else {
        setErrorMessage(response.data?.message || 'Failed to register device');
      }
    } catch (error: any) {
      console.error('Error registering device:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to register O.MG Cable. Please try again.');
      
      // If we get a 401, redirect to login
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUpdateStatus = async (id: number, status: 'online' | 'offline') => {
    setErrorMessage(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        window.location.href = '/login';
        return;
      }
      
      const response = await axios.patch(`${API_URL}/devices/${id}`, 
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data && response.data.success) {
        setSuccessMessage(`O.MG Cable status updated to ${status}`);
        
        // Update device in state
        setDevices(prev => prev.map(device => 
          device.id === id ? { ...device, status } : device
        ));
      } else {
        setErrorMessage(response.data?.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating device status:', error);
      setErrorMessage('Failed to update O.MG Cable status. Please try again.');
      
      // If we get a 401, redirect to login
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Online</span>;
      case 'busy':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">Busy</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Offline</span>;
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
        <h1 className="text-xl font-semibold text-white">Device Management</h1>
        <p className="text-sm text-slate-400">Manage and monitor your O.MG Cables and device connections</p>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-3 py-2 text-sm font-medium bg-green-500/10 text-green-500 border border-green-500/30 rounded hover:bg-green-500/20 transition-colors"
        >
          <FiPlus className="mr-2" size={16} />
          Register New Cable
        </button>
        
        <button 
          onClick={fetchDevices}
          className="inline-flex items-center px-3 py-2 text-sm font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50 rounded hover:bg-slate-700 transition-colors"
          disabled={isLoading}
        >
          <FiRefreshCw className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} size={16} />
          Refresh
        </button>
      </div>
      
      {/* Status Messages */}
      {errorMessage && (
        <div className="mb-5 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-sm">
          <div className="flex items-center">
            <FiAlertCircle className="mr-2 flex-shrink-0" size={16} />
            <p>{errorMessage}</p>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-5 p-3 bg-green-900/20 border border-green-500/30 rounded text-green-400 text-sm">
          <div className="flex items-center">
            <FiCheck className="mr-2 flex-shrink-0" size={16} />
            <p>{successMessage}</p>
          </div>
        </div>
      )}
      
      {/* Devices Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-md shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <h2 className="font-medium text-white flex items-center">
            <FiServer className="mr-2 text-green-500" size={16} />
            Registered Cables
          </h2>
          <span className="text-xs font-medium text-slate-400">
            {devices.length} {devices.length === 1 ? 'Cable' : 'Cables'}
          </span>
        </div>
        
        {devices.length === 0 ? (
          <div className="p-6 text-center text-slate-400">
            <FiInfo className="mx-auto mb-2" size={20} />
            <p className="text-sm">No cables registered yet. Register a new cable to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-700/30 text-left">
                  <th className="px-4 py-2 text-xs font-medium text-slate-400">Name</th>
                  <th className="px-4 py-2 text-xs font-medium text-slate-400">IP Address</th>
                  <th className="px-4 py-2 text-xs font-medium text-slate-400">Firmware</th>
                  <th className="px-4 py-2 text-xs font-medium text-slate-400">Last Check-in</th>
                  <th className="px-4 py-2 text-xs font-medium text-slate-400">Status</th>
                  <th className="px-4 py-2 text-xs font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {devices.map(device => (
                  <tr key={device.id} className="hover:bg-slate-700/10 transition-colors">
                    <td className="px-4 py-3 text-white text-sm">{device.name}</td>
                    <td className="px-4 py-3 text-slate-300 text-sm font-mono">{device.ipAddress}</td>
                    <td className="px-4 py-3 text-slate-300 text-sm">{device.firmwareVersion || 'Unknown'}</td>
                    <td className="px-4 py-3 text-slate-300 text-sm">{formatDateTime(device.lastCheckIn)}</td>
                    <td className="px-4 py-3">{getStatusBadge(device.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleUpdateStatus(device.id, 'online')}
                          disabled={device.status === 'online'}
                          className={`p-1 rounded text-xs ${
                            device.status === 'online'
                              ? 'text-slate-500 cursor-not-allowed'
                              : 'text-green-500 hover:bg-green-500/10 hover:border-green-500/30'
                          }`}
                          title="Set Online"
                        >
                          <FiCheck size={16} />
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(device.id, 'offline')}
                          disabled={device.status === 'offline'}
                          className={`p-1 rounded text-xs ${
                            device.status === 'offline'
                              ? 'text-slate-500 cursor-not-allowed'
                              : 'text-red-500 hover:bg-red-500/10 hover:border-red-500/30'
                          }`}
                          title="Set Offline"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Usage Info Card */}
      <div className="mt-6 bg-slate-800 border border-slate-700 rounded-md p-4 shadow-sm">
        <h3 className="text-sm font-medium text-white flex items-center mb-2">
          <FiInfo className="mr-2 text-green-500" size={16} />
          How to Use O.MG Cables
        </h3>
        <ul className="text-xs text-slate-400 space-y-2">
          <li className="flex">
            <span className="mr-2">1.</span>
            <span>Register your cable using its local IP address when connected to the same network</span>
          </li>
          <li className="flex">
            <span className="mr-2">2.</span>
            <span>Create a payload in the Payload Editor to deploy to your cables</span>
          </li>
          <li className="flex">
            <span className="mr-2">3.</span>
            <span>Monitor the status and activity of your cables in the Dashboard</span>
          </li>
          <li className="flex">
            <span className="mr-2">4.</span>
            <span>View results and captured data in the Results page</span>
          </li>
        </ul>
      </div>
      
      {/* Add Device Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white"
            >
              <FiX size={18} />
            </button>
            <div className="mb-5">
              <h2 className="text-lg font-medium text-white">Register O.MG Cable</h2>
              <p className="text-sm text-slate-400">Enter the details of your cable</p>
            </div>
            <div className="space-y-4">
              <div className="relative border border-slate-600 rounded-md">
                <label className="absolute -top-2.5 left-2 px-1 bg-slate-800 text-xs font-medium text-slate-400">
                  Cable Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Conference Room Cable"
                  className="w-full px-3 py-2 bg-transparent text-white text-sm focus:outline-none"
                />
              </div>
              <div className="relative border border-slate-600 rounded-md">
                <label className="absolute -top-2.5 left-2 px-1 bg-slate-800 text-xs font-medium text-slate-400">
                  IP Address
                </label>
                <input
                  type="text"
                  name="ipAddress"
                  value={formData.ipAddress}
                  onChange={handleInputChange}
                  placeholder="192.168.1.100"
                  className="w-full px-3 py-2 bg-transparent text-white text-sm focus:outline-none"
                />
              </div>
              <div className="relative border border-slate-600 rounded-md">
                <label className="absolute -top-2.5 left-2 px-1 bg-slate-800 text-xs font-medium text-slate-400">
                  Firmware Version (optional)
                </label>
                <input
                  type="text"
                  name="firmwareVersion"
                  value={formData.firmwareVersion}
                  onChange={handleInputChange}
                  placeholder="v1.0.0"
                  className="w-full px-3 py-2 bg-transparent text-white text-sm focus:outline-none"
                />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-300 hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-md text-sm text-green-500 hover:bg-green-500/20 flex items-center"
                >
                  {isLoading && <FiRefreshCw className="mr-2 animate-spin" size={14} />}
                  Register Cable
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManagement; 