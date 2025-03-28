import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiRefreshCw, 
  FiInfo, 
  FiServer, 
  FiAlertCircle, 
  FiCheck, 
  FiX, 
  FiHardDrive,
  FiWifi,
  FiEye,
  FiPlus,
  FiSearch,
  FiFilter,
  FiTrash2,
  FiEdit2,
  FiZap
} from 'react-icons/fi';
import { apiService, DeviceStatus, ApiResponse } from '../services/ApiService';
import { handleAuthError, isAuthError } from '../utils/tokenManager';
import { 
  isWebSerialSupported, 
  requestSerialPort, 
  connectToDevice, 
  disconnectFromDevice,
  type SerialConnectionStatus,
  OMGDeviceInfo
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
  id: string;
  name: string;
  status: string;
  connectionType: string;
  ipAddress?: string;
  serialPortId?: string;
  firmwareVersion?: string;
  lastCheckIn?: string;
  userId: string;
  owner?: {
    id: string;
    name: string;
    username: string;
  };
  lastSeen?: string;
  batteryLevel?: number;
  signalStrength?: number;
  errors?: string[];
  capabilities?: {
    storage: string;
    availableSlots: number;
    supportedFeatures: string[];
  };
  attackState?: {
    currentPayload: string;
    targetSystem: string;
    progress: number;
    startTime: string;
    estimatedDuration: number;
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

interface DeviceRegistration {
  name: string;
  ipAddress?: string;
  serialPortId?: string;
  connectionType: 'network' | 'usb';
  firmwareVersion?: string;
}

interface DeviceInfo {
  info: {
    name?: string;
    deviceId: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Update the response interfaces to match the actual API response structure
interface DeviceResponse {
  device: Device;
}

interface DevicesResponse {
  devices: Device[];
}

interface DeployResponse {
  estimatedDuration: number;
}

const DeviceManagement: React.FC = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<DeviceRegistration>({
    name: '',
    ipAddress: '',
    connectionType: 'network',
    firmwareVersion: ''
  });
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCooldown, setRefreshCooldown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterConnectionType, setFilterConnectionType] = useState<string>('all');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isRegisteringUSB, setIsRegisteringUSB] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const REFRESH_COOLDOWN = 5000; // 5 seconds cooldown between refreshes
  const componentMounted = useRef(true);
  const isMountedRef = useRef(true);

  // Refs for managing state and cleanup
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUsbModalOpen, setIsUsbModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedPayload, setSelectedPayload] = useState<string | null>(null);
  const [attackConfig, setAttackConfig] = useState({
    targetSystem: '',
    delayBetweenKeystrokes: 0,
    autoReconnect: true,
    stealthMode: false
  });
  
  // Refs for managing state and cleanup
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTimeRef = useRef<number>(0);
  const isInitialLoadRef = useRef(true);
  const MAX_REFRESH_ATTEMPTS = 3;
  const refreshAttemptsRef = useRef(0);

  const handleDeviceUpdate = useCallback((event: CustomEvent<{ deviceId: string; status: DeviceStatus }>) => {
    const { deviceId, status } = event.detail;
    
    setDevices(prevDevices => {
      const deviceIndex = prevDevices.findIndex(d => d.id === deviceId);
      if (deviceIndex === -1) return prevDevices;

      const updatedDevices = [...prevDevices];
      updatedDevices[deviceIndex] = {
        ...updatedDevices[deviceIndex],
        status: status.status,
        lastSeen: status.lastSeen,
        batteryLevel: status.batteryLevel,
        signalStrength: status.signalStrength,
        errors: status.errors
      };
      return updatedDevices;
    });
  }, []);

  const fetchDevices = useCallback(async () => {
    if (!componentMounted.current) return;
    
    try {
      setError(null);
      setIsLoading(true);
      const response = await apiService.get<DevicesResponse>('/devices');
      
      if (componentMounted.current && response.success && response.data.devices) {
        setDevices(response.data.devices);
        // Subscribe to updates for each device
        response.data.devices.forEach((device: Device) => {
          apiService.subscribeToDevice(device.id, 'DeviceManagement');
        });
      }
    } catch (err) {
      if (componentMounted.current) {
        setError('Failed to fetch devices');
        console.error('Error fetching devices:', err);
      }
    } finally {
      if (componentMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < REFRESH_COOLDOWN) {
      console.log('Refresh cooldown in effect');
      return;
    }

    if (isRefreshing) {
      console.log('Already refreshing');
      return;
    }

    lastRefreshTimeRef.current = now;
    setIsRefreshing(true);

    try {
      await Promise.all(devices.map(device => 
        apiService.refreshDeviceStatus(device.id)
      ));
    } catch (err) {
      console.error('Error refreshing devices:', err);
      setError('Failed to refresh devices');
    } finally {
      setIsRefreshing(false);
    }
  }, [devices, isRefreshing]);

  const handleRegisterUSBDevice = useCallback(async () => {
    try {
      setError(null);
      const port = await requestSerialPort();
      if (!port) {
        setError('No serial port selected');
        return;
      }

      const deviceInfo = await connectToDevice(port);
      if (!deviceInfo) {
        setError('Failed to connect to device');
        return;
      }

      // Register the device with the backend
      await apiService.post('/devices', deviceInfo);
      await fetchDevices(); // Refresh the device list
    } catch (err) {
      console.error('Error registering USB device:', err);
      setError('Failed to register USB device');
    }
  }, [fetchDevices]);

  useEffect(() => {
    // Initial fetch
    fetchDevices();

    // Set up device update listener
    window.addEventListener('device:update', handleDeviceUpdate as EventListener);

    return () => {
      componentMounted.current = false;
      // Clean up subscriptions
      devices.forEach(device => {
        apiService.unsubscribeFromDevice(device.id, 'DeviceManagement');
      });
      // Remove event listener
      window.removeEventListener('device:update', handleDeviceUpdate as EventListener);
    };
  }, [fetchDevices, handleDeviceUpdate, devices]);

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
    setFormData(prev => ({
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
    
    if (formData.connectionType === 'network' && !formData.ipAddress?.trim()) {
      setErrorMessage('IP Address is required');
      return false;
    }
    
    // Simple IP validation
    if (formData.connectionType === 'network' && formData.ipAddress) {
      const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipPattern.test(formData.ipAddress)) {
        setErrorMessage('Invalid IP Address format. Use format: xxx.xxx.xxx.xxx');
        return false;
      }
    }
    
    return true;
  };
  
  // Validate USB form data
  const validateUsbForm = () => {
    if (!formData.name.trim()) {
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
      connectionType: 'network',
      firmwareVersion: ''
    });
  };
  
  // Reset USB form data
  const resetUsbForm = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setFormData({
      name: '',
      connectionType: 'usb',
      firmwareVersion: ''
    });
  };
  
  // Register network device
  const registerDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!validateForm()) {
        return;
      }

      const response = await apiService.post<DeviceResponse>('/devices', {
        name: formData.name,
        ipAddress: formData.ipAddress,
        firmwareVersion: formData.firmwareVersion || '1.0.0',
        connectionType: 'network'
      });
      
      if (response.success && response.data.device) {
        setSuccessMessage('Device registered successfully!');
        setFormData({
          name: '',
          ipAddress: '',
          connectionType: 'network',
          firmwareVersion: ''
        });
        setIsModalOpen(false);
        
        // Update devices list
        setDevices(prev => [...prev, response.data.device]);
      } else {
        setErrorMessage(response.message || 'Failed to register device');
      }
    } catch (error) {
      console.error('Error registering device:', error);
      if (isAuthError(error)) {
        handleAuthError(error, 'Authentication error in DeviceManagement');
      } else {
        setErrorMessage((error as any)?.response?.data?.message || 'Error registering device');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Register USB device
  const registerUsbDevice = async () => {
    if (!isMountedRef.current) return;
    
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Request serial port access
      const port = await requestSerialPort();
      if (!port) {
        setErrorMessage('No USB device selected or selection was cancelled');
        return;
      }

      // Show connecting message
      setSuccessMessage('Connecting to device...');

      // Connect to the device with timeout
      const connectPromise = connectToDevice(port, {
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout - please try again')), 15000);
      });
      
      const deviceInfo = await Promise.race([connectPromise, timeoutPromise]) as OMGDeviceInfo;

      if (!isMountedRef.current) return;

      if (deviceInfo.connectionStatus !== 'connected') {
        setErrorMessage('Failed to establish connection with the device');
        return;
      }

      // Show device info message
      setSuccessMessage(`Connected to ${deviceInfo.info.name || formData.name || 'O.MG Cable'}...`);

      // Register the device
      const response = await apiService.post<DeviceResponse>('/devices', {
        name: deviceInfo.info.name || formData.name || 'O.MG Cable',
        serialPortId: deviceInfo.info.deviceId,
        connectionType: 'usb',
        firmwareVersion: deviceInfo.info.firmwareVersion || formData.firmwareVersion || null
      });

      if (!isMountedRef.current) return;

      if (response.success && response.data.device) {
        setSuccessMessage('USB device registered successfully!');
        setIsUsbModalOpen(false);
        refreshAttemptsRef.current = 0;
        
        // Update devices list
        setDevices(prev => [...prev, response.data.device]);

        // Clear form data
        resetUsbForm();
      } else {
        setErrorMessage(response.message || 'Failed to register USB device');
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      
      console.error('Error registering USB device:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error registering USB device');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };
  
  // Update device status without triggering a refresh
  const updateDeviceStatus = async (deviceId: string, status: string) => {
    if (!isMountedRef.current) return;
    
    setErrorMessage(null);
    
    try {
      const response = await apiService.patch<DeviceResponse>(`/devices/${deviceId}`, { status });
      
      if (!isMountedRef.current) return;

      if (response.success) {
        setSuccessMessage(`Device status updated to ${status}`);
        setDevices(prev => prev.map(device => device.id === deviceId ? { ...device, status } : device));
        refreshAttemptsRef.current = 0;
      } else {
        setErrorMessage(response.message || 'Failed to update device status');
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      
      console.error('Error updating device status:', error);
      setErrorMessage('Failed to update device status');
      
      if (isAuthError(error)) {
        handleAuthError(error, 'Authentication error while updating device status');
      }
    }
  };
  
  // Deploy payload
  const deployPayload = async (deviceId: string, payloadId: string) => {
    if (!isMountedRef.current) return;

    try {
      const response = await apiService.post<DeployResponse>(`/devices/${deviceId}/deploy`, {
        payloadId,
        config: {
          ...attackConfig,
          timestamp: new Date().toISOString()
        }
      });

      if (response.success && response.data) {
        const { estimatedDuration } = response.data;
        setSuccessMessage('Payload deployment initiated');
        // Update device status without triggering a refresh
        setDevices(prev => prev.map(device => 
          device.id === deviceId ? 
          { 
            ...device, 
            status: 'attacking',
            attackState: {
              currentPayload: payloadId,
              targetSystem: attackConfig.targetSystem,
              progress: 0,
              startTime: new Date().toISOString(),
              estimatedDuration
            }
          } : device
        ));
      }
    } catch (error) {
      console.error('Error deploying payload:', error);
      setErrorMessage('Failed to deploy payload. Please try again.');
    }
  };
  
  // Get status badge based on device status
  const getStatusBadge = (status: string, device: Device) => {
    switch (status) {
      case 'attacking':
        return (
          <span className="flex items-center px-2 py-1 text-xs font-medium rounded-md bg-red-500/10 text-red-500 border border-red-500/30">
            <FiAlertCircle className="mr-1 animate-pulse" /> Attacking
            {device.attackState?.progress && (
              <span className="ml-1">({Math.round(device.attackState.progress)}%)</span>
            )}
          </span>
        );
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
  const formatDateTime = (dateString: string | undefined | null) => {
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
  
  // Add to the device details panel
  const renderDeviceCapabilities = (device: Device) => {
    if (!device.capabilities) return null;
    
    return (
      <div className="mt-4 space-y-4">
        <h4 className="text-sm font-medium text-white">Device Capabilities</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-700/30 p-3 rounded-md">
            <h5 className="text-xs font-medium text-slate-300 mb-2">Storage</h5>
            <p className="text-sm text-white">{device.capabilities.storage}</p>
          </div>
          <div className="bg-slate-700/30 p-3 rounded-md">
            <h5 className="text-xs font-medium text-slate-300 mb-2">Payload Slots</h5>
            <p className="text-sm text-white">{device.capabilities.availableSlots}</p>
          </div>
          <div className="bg-slate-700/30 p-3 rounded-md col-span-2">
            <h5 className="text-xs font-medium text-slate-300 mb-2">Features</h5>
            <div className="flex flex-wrap gap-2">
              {device.capabilities.supportedFeatures.map(feature => (
                <span key={feature} className="px-2 py-1 text-xs bg-slate-600/50 text-slate-300 rounded-md">
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        {device.status === 'attacking' && device.attackState && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-md p-4 mt-4">
            <h4 className="text-sm font-medium text-red-400 mb-2">Active Attack</h4>
            <div className="space-y-2">
              <p className="text-sm text-red-300">
                Target: {device.attackState.targetSystem}
              </p>
              <p className="text-sm text-red-300">
                Started: {formatDateTime(device.attackState.startTime || '')}
              </p>
              <div className="w-full bg-red-900/30 rounded-full h-2 mt-2">
                <div 
                  className="bg-red-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${device.attackState.progress || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Device Management</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed border border-slate-600 rounded-md text-white text-sm font-medium transition-colors"
          >
            <FiRefreshCw className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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
                      <td className="px-4 py-3 text-sm text-slate-300">{formatDateTime(device.lastSeen)}</td>
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
                      value={formData.name}
                      onChange={handleInputChange}
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
      
      {/* Enhanced Device Details Modal */}
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
                    port: {} as SerialPort,
                    reader: null,
                    writer: null,
                    connectionStatus: selectedDevice.status === 'attacking' ? 'connected' : 
                                    selectedDevice.status === 'online' ? 'connected' : 
                                    selectedDevice.status === 'busy' ? 'connecting' : 'disconnected',
                    info: {
                      name: selectedDevice.name,
                      firmwareVersion: selectedDevice.firmwareVersion || null,
                      deviceId: selectedDevice.id.toString(),
                      capabilities: {
                        usbHid: true,
                        wifi: selectedDevice.connectionType === 'network',
                        bluetooth: false,
                        storage: selectedDevice.capabilities?.storage || '4MB',
                        supportedFeatures: selectedDevice.capabilities?.supportedFeatures || [
                          'DuckyScript',
                          'Payloads',
                          'HID Injection',
                          'Keystroke Injection',
                          'Mass Storage',
                          'Bluetooth Beacon',
                          'WiFi AP'
                        ]
                      }
                    }
                  }}
                  onRefresh={() => handleRefresh()}
                />
                {renderDeviceCapabilities(selectedDevice)}
                
                {/* Attack Configuration */}
                {selectedDevice.status !== 'attacking' && (
                  <div className="mt-6 border-t border-slate-700 pt-6">
                    <h4 className="text-sm font-medium text-white mb-4">Attack Configuration</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Target System
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm"
                          value={attackConfig.targetSystem}
                          onChange={(e) => setAttackConfig(prev => ({
                            ...prev,
                            targetSystem: e.target.value
                          }))}
                          placeholder="Windows 10, macOS, etc."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Keystroke Delay (ms)
                        </label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm"
                          value={attackConfig.delayBetweenKeystrokes}
                          onChange={(e) => setAttackConfig(prev => ({
                            ...prev,
                            delayBetweenKeystrokes: parseInt(e.target.value) || 0
                          }))}
                        />
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={attackConfig.autoReconnect}
                              onChange={(e) => setAttackConfig(prev => ({
                                ...prev,
                                autoReconnect: e.target.checked
                              }))}
                              className="form-checkbox bg-slate-700 border-slate-600 text-purple-500 rounded"
                            />
                            <span className="text-sm text-slate-300">Auto Reconnect</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={attackConfig.stealthMode}
                              onChange={(e) => setAttackConfig(prev => ({
                                ...prev,
                                stealthMode: e.target.checked
                              }))}
                              className="form-checkbox bg-slate-700 border-slate-600 text-purple-500 rounded"
                            />
                            <span className="text-sm text-slate-300">Stealth Mode</span>
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <button
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-md text-red-500 text-sm font-medium transition-colors disabled:opacity-50"
                        onClick={() => selectedPayload && deployPayload(selectedDevice.id, selectedPayload)}
                        disabled={!selectedPayload || isLoading}
                      >
                        Deploy Payload
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManagement;
