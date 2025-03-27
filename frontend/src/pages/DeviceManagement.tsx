import React, { useState, useEffect } from 'react';
import { 
  FiRefreshCw, 
  FiInfo, 
  FiServer, 
  FiAlertCircle, 
  FiCheck, 
  FiX, 
  FiHardDrive,
  FiWifi,
  FiEye
} from 'react-icons/fi';
import apiServiceInstance, { ApiService } from '../services/ApiService';
import { handleAuthError, isAuthError } from '../utils/tokenManager';
import { 
  isWebSerialSupported, 
  requestSerialPort, 
  connectToDevice, 
  disconnectFromDevice,
  type SerialConnectionStatus
} from '../utils/webSerialUtils';
import DeviceInfoPanel from '../components/DeviceInfoPanel';

// We need to define SerialPort interface here since we're using it only for type casting
interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

interface SerialPort {
  getInfo(): SerialPortInfo;
  open: (options: any) => Promise<void>;
  close: () => Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
}

interface Device {
  id: number;
  name: string;
  ipAddress: string;
  firmwareVersion: string | null;
  status: 'online' | 'offline' | 'busy';
  lastCheckIn: string | null;
  createdAt: string;
  updatedAt: string;
  connectionType?: 'network' | 'usb';
  serialPortId?: string;
  userId: number;
  owner?: {
    id: number;
    username: string;
    email: string;
  };
}

interface DeviceFormData {
  name: string;
  ipAddress: string;
  firmwareVersion: string;
}

interface UsbDeviceFormData {
  name: string;
  firmwareVersion: string;
}

interface DeviceStatusUpdate {
  deviceId: number;
  status: 'online' | 'offline' | 'busy';
  lastCheckIn?: string;
}

interface DeviceRegistration extends Device {
  id: number;
  name: string;
  status: 'online' | 'offline' | 'busy';
}

const DeviceManagement: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUsbModalOpen, setIsUsbModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [formData, setFormData] = useState<DeviceFormData>({
    name: '',
    ipAddress: '',
    firmwareVersion: ''
  });
  const [usbFormData, setUsbFormData] = useState<UsbDeviceFormData>({
    name: '',
    firmwareVersion: ''
  });
  
  // Fetch devices on component mount and set up socket listeners
  useEffect(() => {
    let isMounted = true;
    const socket = ApiService.getSocket();
    let intervalId: NodeJS.Timeout | null = null;

    const fetchIfNeeded = async () => {
      const now = Date.now();
      // Only fetch if more than 5 minutes have passed since last fetch and component is still mounted
      if (now - lastFetchTime >= 300000 && !isLoading && isMounted) {
        await fetchDevices();
        if (isMounted) {
          setLastFetchTime(now);
        }
      }
    };

    // Initial fetch only if no devices loaded
    if (devices.length === 0) {
      fetchDevices();
    }
    
    // Set up socket event listeners for real-time updates
    if (socket) {
      // Remove any existing listeners first to prevent duplicates
      socket.off('device_status_changed');
      socket.off('device_registered');
      socket.off('device_removed');

      socket.on('device_status_changed', (data: DeviceStatusUpdate) => {
        if (isMounted) {
          setDevices(prev => prev.map(device => 
            device.id === data.deviceId ? { ...device, ...data } : device
          ));
        }
      });

      socket.on('device_registered', (data: DeviceRegistration) => {
        if (isMounted) {
          setDevices(prev => [...prev, data]);
          setSuccessMessage('New device registered successfully!');
        }
      });

      socket.on('device_removed', (deviceId: number) => {
        if (isMounted) {
          setDevices(prev => prev.filter(device => device.id !== deviceId));
        }
      });
    }

    // Set up polling interval as backup (every 5 minutes)
    intervalId = setInterval(fetchIfNeeded, 300000);

    // Cleanup
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (socket) {
        socket.off('device_status_changed');
        socket.off('device_registered');
        socket.off('device_removed');
      }
    };
  }, []); // Remove lastFetchTime and isLoading from dependencies
  
  // Fetch devices from API with debounce and caching
  const fetchDevices = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      const response = await apiServiceInstance.get('/devices');
      
      if (response.data && response.data.success) {
        const updatedDevices = response.data.data.map((device: Device) => {
          const lastCheckIn = device.lastCheckIn ? new Date(device.lastCheckIn) : null;
          const now = new Date();
          const diffMs = lastCheckIn ? now.getTime() - lastCheckIn.getTime() : Infinity;
          const diffMins = diffMs / 60000;
          
          return {
            ...device,
            status: diffMins > 5 ? 'offline' : device.status
          };
        });
        
        // Only update if data has changed
        if (JSON.stringify(devices) !== JSON.stringify(updatedDevices)) {
          setDevices(updatedDevices);
        }
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      
      if (isAuthError(error)) {
        handleAuthError(error, 'Authentication error in DeviceManagement');
      } else if ((error as any)?.response?.status !== 404) {
        setErrorMessage((error as any)?.response?.data?.message || 'Error fetching devices');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle USB form input changes
  const handleUsbInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUsbFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Validate form data
  const validateForm = () => {
    if (!formData.name.trim()) {
      setErrorMessage('Device name is required');
      return false;
    }
    
    if (!formData.ipAddress.trim()) {
      setErrorMessage('IP Address is required');
      return false;
    }
    
    // Simple IP validation
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(formData.ipAddress)) {
      setErrorMessage('Invalid IP Address format. Use format: xxx.xxx.xxx.xxx');
      return false;
    }
    
    return true;
  };
  
  // Validate USB form data
  const validateUsbForm = () => {
    if (!usbFormData.name.trim()) {
      setErrorMessage('Device name is required');
      return false;
    }
    
    return true;
  };
  
  // Reset form data
  const resetForm = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setFormData({
      name: '',
      ipAddress: '',
      firmwareVersion: ''
    });
  };
  
  // Reset USB form data
  const resetUsbForm = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setUsbFormData({
      name: '',
      firmwareVersion: ''
    });
  };
  
  // Register network device with improved error handling
  const registerDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (isLoading) {
      setErrorMessage('Registration already in progress');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      const response = await apiServiceInstance.post('/devices', {
        name: formData.name,
        ipAddress: formData.ipAddress,
        firmwareVersion: formData.firmwareVersion || '1.0.0',
        connectionType: 'network'
      });
      
      if (response.data && response.data.success) {
        setSuccessMessage('O.MG Cable registered successfully!');
        setFormData({
          name: '',
          ipAddress: '',
          firmwareVersion: ''
        });
        setIsModalOpen(false);
        
        // Wait a moment before refreshing the device list
        setTimeout(() => {
          fetchDevices();
        }, 1000);
      } else {
        throw new Error(response.data?.message || 'Failed to register device');
      }
    } catch (error) {
      console.error('Error registering device:', error);
      setErrorMessage((error as any)?.response?.data?.message || 'Failed to register O.MG Cable. Please try again.');
      
      if (isAuthError(error)) {
        handleAuthError(error, 'Authentication error while registering device');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Register USB device
  const registerUsbDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateUsbForm()) {
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      // Request serial port access
      const port = await requestSerialPort();
      
      if (!port) {
        setErrorMessage('Failed to access USB device. Please try again.');
        setIsLoading(false);
        return;
      }
      
      // Get device info
      const portInfo = port.getInfo();
      
      // Register device with backend
      const response = await apiServiceInstance.post('/devices', {
        name: usbFormData.name,
        firmwareVersion: usbFormData.firmwareVersion || '1.0.0',
        connectionType: 'usb',
        serialPortId: `${portInfo.usbVendorId || 0}:${portInfo.usbProductId || 0}`
      });
      
      if (response.data && response.data.success) {
        setSuccessMessage('USB O.MG Cable registered successfully!');
        
        // Reset form
        setUsbFormData({
          name: '',
          firmwareVersion: ''
        });
        
        // Close modal
        setIsUsbModalOpen(false);
        
        // Refresh device list
        fetchDevices();
      } else {
        setErrorMessage('Failed to register USB O.MG Cable. Please try again.');
      }
    } catch (error) {
      console.error('Error registering USB device:', error);
      setErrorMessage((error as any)?.response?.data?.message || 'Failed to register USB O.MG Cable. Please try again.');
      
      // If we get an unauthorized error, use tokenManager to handle it properly
      if (isAuthError(error)) {
        handleAuthError(error, 'Authentication error while registering USB device');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update device status
  const updateDeviceStatus = async (deviceId: number, status: 'online' | 'offline' | 'busy') => {
    setErrorMessage(null);
    
    try {
      const response = await apiServiceInstance.patch(`/devices/${deviceId}`, {
        status
      });
      
      if (response.data && response.data.success) {
        setSuccessMessage(`Device status updated to ${status}`);
        
        // Update devices list
        setDevices(prev => 
          prev.map(device => 
            device.id === deviceId ? { ...device, status } : device
          )
        );
      } else {
        setErrorMessage('Failed to update O.MG Cable status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating device status:', error);
      setErrorMessage('Failed to update O.MG Cable status. Please try again.');
      
      // If we get an unauthorized error, use tokenManager to handle it properly
      if (isAuthError(error)) {
        handleAuthError(error, 'Authentication error while updating device status');
      }
    }
  };
  
  // Get status badge based on device status
  const getStatusBadge = (status: string, device: Device) => {
    switch (status) {
      case 'online':
        return (
          <span className="flex items-center px-2 py-1 text-xs font-medium rounded-md bg-green-500/10 text-green-500 border border-green-500/30">
            <FiCheck className="mr-1" /> Online
          </span>
        );
      case 'offline':
        return (
          <span className="flex items-center px-2 py-1 text-xs font-medium rounded-md bg-slate-500/10 text-slate-400 border border-slate-500/30">
            <FiX className="mr-1" /> Offline
          </span>
        );
      case 'busy':
        return (
          <span className="flex items-center px-2 py-1 text-xs font-medium rounded-md bg-yellow-500/10 text-yellow-500 border border-yellow-500/30">
            <FiRefreshCw className="mr-1" /> Busy
          </span>
        );
      default:
        return (
          <span className="flex items-center px-2 py-1 text-xs font-medium rounded-md bg-slate-500/10 text-slate-400 border border-slate-500/30">
            <FiInfo className="mr-1" /> Unknown
          </span>
        );
    }
  };
  
  // Get connection type badge
  const getConnectionTypeBadge = (connectionType?: string) => {
    return connectionType === 'usb' ? (
      <span className="flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/30">
        <FiHardDrive className="mr-1" /> USB
      </span>
    ) : (
      <span className="flex items-center px-2 py-1 text-xs font-medium rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/30">
        <FiWifi className="mr-1" /> Network
      </span>
    );
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
  
  // View device details
  const handleViewDeviceDetails = (device: Device) => {
    setSelectedDevice(device);
  };
  
  // Close device details
  const handleCloseDeviceDetails = () => {
    setSelectedDevice(null);
  };
  
  return (
    <div className="flex flex-col h-full p-6">
      <div className="border-b border-slate-700 pb-6 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-white mb-1">O.MG Cable Management</h1>
            <p className="text-sm text-slate-400">Register and manage your O.MG Cables</p>
          </div>
          <div className="flex space-x-2">
            <button 
              className="flex items-center px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-md text-purple-500 text-sm font-medium transition-colors" 
              onClick={() => setIsModalOpen(true)}
            >
              <FiWifi className="mr-2" size={16} /> Register Network Device
            </button>
            
            {isWebSerialSupported() && (
              <button 
                className="flex items-center px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md text-blue-500 text-sm font-medium transition-colors" 
                onClick={() => setIsUsbModalOpen(true)}
              >
                <FiHardDrive className="mr-2" size={16} /> Register USB Device
              </button>
            )}
          </div>
        </div>
      </div>
      
      {errorMessage && (
        <div className="mb-6 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-sm">
          <div className="flex items-center">
            <FiAlertCircle className="mr-2 flex-shrink-0" size={16} />
            <p>{errorMessage}</p>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-6 p-3 bg-green-900/20 border border-green-500/30 rounded text-green-400 text-sm">
          <div className="flex items-center">
            <FiCheck className="mr-2 flex-shrink-0" size={16} />
            <p>{successMessage}</p>
          </div>
        </div>
      )}
      
      <div className="bg-slate-800 border border-slate-700 rounded-md shadow-sm mb-6 overflow-hidden">
        <div className="border-b border-slate-700 px-4 py-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-white">Registered Devices</h2>
            <button 
              className="flex items-center px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md text-blue-500 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={fetchDevices}
              disabled={isLoading}
            >
              <FiRefreshCw className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} size={14} />
              Refresh
            </button>
          </div>
        </div>
        <div className="p-4">
          {isLoading && devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
              <p className="text-slate-400">Loading devices...</p>
            </div>
          ) : devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FiInfo size={48} className="text-slate-500 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No O.MG Cables registered yet</h3>
              <p className="text-slate-400">Register a new device to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Connection</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Last Check-in</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Firmware</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {devices.map(device => (
                    <tr key={device.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-sm text-white">{device.name}</td>
                      <td className="px-4 py-3 text-sm">{getConnectionTypeBadge(device.connectionType)}</td>
                      <td className="px-4 py-3 text-sm">{getStatusBadge(device.status, device)}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{formatDateTime(device.lastCheckIn)}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{device.firmwareVersion || 'Unknown'}</td>
                      <td className="px-4 py-3 text-sm">
                        <button 
                          className="flex items-center px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-md text-indigo-400 text-xs font-medium transition-colors"
                          onClick={() => handleViewDeviceDetails(device)}
                        >
                          <FiEye className="mr-1" size={12} /> Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Network Device Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" tabIndex={-1}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => {
              setIsModalOpen(false);
              resetForm();
            }}></div>
            <div className="relative bg-slate-800 rounded-lg max-w-md w-full p-6 border border-slate-700 shadow-xl transform transition-all">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-700">
                <h3 className="text-lg font-medium text-white">Register Network O.MG Cable</h3>
                <button 
                  type="button" 
                  className="text-slate-400 hover:text-white" 
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                >
                  <FiX size={20} />
                </button>
              </div>
              <form onSubmit={registerDevice}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">Device Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="ipAddress" className="block text-sm font-medium text-slate-300 mb-1">IP Address</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      id="ipAddress"
                      name="ipAddress"
                      placeholder="192.168.1.100"
                      value={formData.ipAddress}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="firmwareVersion" className="block text-sm font-medium text-slate-300 mb-1">Firmware Version (Optional)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      id="firmwareVersion"
                      name="firmwareVersion"
                      placeholder="1.0.0"
                      value={formData.firmwareVersion}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <button 
                    type="button" 
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-md text-white text-sm font-medium transition-colors" 
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Registering...
                      </>
                    ) : (
                      'Register Device'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* USB Device Registration Modal */}
      {isUsbModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" tabIndex={-1}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => {
              setIsUsbModalOpen(false);
              resetUsbForm();
            }}></div>
            <div className="relative bg-slate-800 rounded-lg max-w-md w-full p-6 border border-slate-700 shadow-xl transform transition-all">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-700">
                <h3 className="text-lg font-medium text-white">Register USB O.MG Cable</h3>
                <button 
                  type="button" 
                  className="text-slate-400 hover:text-white" 
                  onClick={() => {
                    setIsUsbModalOpen(false);
                    resetUsbForm();
                  }}
                >
                  <FiX size={20} />
                </button>
              </div>
              <form onSubmit={registerUsbDevice}>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded text-blue-400 text-sm">
                    <div className="flex items-center">
                      <FiInfo className="mr-2 flex-shrink-0" size={16} />
                      <p>You will be prompted to select your O.MG Cable from the USB devices list after clicking "Register Device".</p>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="usbName" className="block text-sm font-medium text-slate-300 mb-1">Device Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      id="usbName"
                      name="name"
                      value={usbFormData.name}
                      onChange={handleUsbInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="usbFirmwareVersion" className="block text-sm font-medium text-slate-300 mb-1">Firmware Version (Optional)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      id="usbFirmwareVersion"
                      name="firmwareVersion"
                      placeholder="1.0.0"
                      value={usbFormData.firmwareVersion}
                      onChange={handleUsbInputChange}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <button 
                    type="button" 
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-md text-white text-sm font-medium transition-colors" 
                    onClick={() => {
                      setIsUsbModalOpen(false);
                      resetUsbForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md text-blue-500 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Registering...
                      </>
                    ) : (
                      'Register Device'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Device Details Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 overflow-y-auto" tabIndex={-1}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleCloseDeviceDetails}></div>
            <div className="relative bg-slate-800 rounded-lg max-w-4xl w-full p-6 border border-slate-700 shadow-xl transform transition-all">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-700">
                <h3 className="text-lg font-medium text-white">Device Details: {selectedDevice.name}</h3>
                <button 
                  type="button" 
                  className="text-slate-400 hover:text-white" 
                  onClick={handleCloseDeviceDetails}
                >
                  <FiX size={20} />
                </button>
              </div>
              <div className="py-4">
                <DeviceInfoPanel 
                  deviceInfo={{
                    name: selectedDevice.name,
                    port: {} as SerialPort, // Mock SerialPort object
                    reader: null,
                    writer: null,
                    connectionStatus: selectedDevice.status === 'online' ? 'connected' : 'disconnected',
                    info: {
                      name: selectedDevice.name,
                      firmwareVersion: selectedDevice.firmwareVersion,
                      deviceId: selectedDevice.id.toString(),
                      capabilities: {
                        usbHid: true,
                        wifi: selectedDevice.connectionType === 'network',
                        bluetooth: false,
                        storage: "4MB",
                        supportedFeatures: ['DuckyScript', 'Payloads']
                      }
                    }
                  }} 
                  onRefresh={() => fetchDevices()}
                />
              </div>
              <div className="flex justify-end pt-4 border-t border-slate-700">
                <button 
                  type="button" 
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-md text-white text-sm font-medium transition-colors" 
                  onClick={handleCloseDeviceDetails}
                >
                  Close
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
