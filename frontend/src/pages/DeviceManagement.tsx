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
import apiServiceInstance from '../services/ApiService';
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

const DeviceManagement: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUsbModalOpen, setIsUsbModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState<DeviceFormData>({
    name: '',
    ipAddress: '',
    firmwareVersion: ''
  });
  const [usbFormData, setUsbFormData] = useState<UsbDeviceFormData>({
    name: '',
    firmwareVersion: ''
  });
  
  // Fetch devices on component mount
  useEffect(() => {
    fetchDevices();
    
    // Set up refresh interval
    const intervalId = setInterval(() => {
      fetchDevices();
    }, 30000); // Refresh every 30 seconds
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);
  
  // Fetch devices from API
  const fetchDevices = async () => {
    setIsLoading(true);
    
    try {
      const response = await apiServiceInstance.get('/devices');
      
      if (response.data && response.data.success) {
        // Process devices to add connection status
        const updatedDevices = response.data.data.map((device: Device) => {
          // Add connection status based on last check-in time
          const lastCheckIn = device.lastCheckIn ? new Date(device.lastCheckIn) : null;
          const now = new Date();
          const diffMs = lastCheckIn ? now.getTime() - lastCheckIn.getTime() : Infinity;
          const diffMins = diffMs / 60000;
          
          // If last check-in was more than 5 minutes ago, mark as offline
          if (diffMins > 5) {
            device.status = 'offline';
          }
          
          return device;
        });
        
        setDevices(updatedDevices);
      } else {
        console.error('Invalid response format:', response);
        setErrorMessage('Failed to load O.MG Cables. Invalid response format.');
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      
      // If we get an unauthorized error, use tokenManager to handle it properly
      if (isAuthError(error)) {
        handleAuthError(error, 'Authentication error in DeviceManagement');
      } else {
        // Set devices to empty array instead of showing error
        // This is expected when no devices are available yet
        setDevices([]);
        setErrorMessage(null);
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
  
  // Register network device
  const registerDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
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
        
        // Reset form
        setFormData({
          name: '',
          ipAddress: '',
          firmwareVersion: ''
        });
        
        // Close modal
        setIsModalOpen(false);
        
        // Refresh device list
        fetchDevices();
      } else {
        setErrorMessage('Failed to register O.MG Cable. Please try again.');
      }
    } catch (error) {
      console.error('Error registering device:', error);
      setErrorMessage((error as any)?.response?.data?.message || 'Failed to register O.MG Cable. Please try again.');
      
      // If we get an unauthorized error, use tokenManager to handle it properly
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
          <span className="badge bg-success">
            <FiCheck className="me-1" /> Online
          </span>
        );
      case 'offline':
        return (
          <span className="badge bg-secondary">
            <FiX className="me-1" /> Offline
          </span>
        );
      case 'busy':
        return (
          <span className="badge bg-warning">
            <FiRefreshCw className="me-1" /> Busy
          </span>
        );
      default:
        return (
          <span className="badge bg-secondary">
            <FiInfo className="me-1" /> Unknown
          </span>
        );
    }
  };
  
  // Get connection type badge
  const getConnectionTypeBadge = (connectionType?: string) => {
    return connectionType === 'usb' ? (
      <span className="badge bg-info"><FiHardDrive className="me-1" /> USB</span>
    ) : (
      <span className="badge bg-primary"><FiWifi className="me-1" /> Network</span>
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
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <FiServer className="me-2" />
          O.MG Cable Management
        </h2>
        <div>
          <button 
            className="btn btn-primary me-2" 
            onClick={() => setIsModalOpen(true)}
          >
            <FiWifi className="me-1" /> Register Network Device
          </button>
          
          {isWebSerialSupported() && (
            <button 
              className="btn btn-info" 
              onClick={() => setIsUsbModalOpen(true)}
            >
              <FiHardDrive className="me-1" /> Register USB Device
            </button>
          )}
        </div>
      </div>
      
      {errorMessage && (
        <div className="alert alert-danger">
          <FiAlertCircle className="me-2" />
          {errorMessage}
        </div>
      )}
      
      {successMessage && (
        <div className="alert alert-success">
          <FiCheck className="me-2" />
          {successMessage}
        </div>
      )}
      
      <div className="card">
        <div className="card-header bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Registered Devices</h5>
            <button 
              className="btn btn-sm btn-outline-primary" 
              onClick={fetchDevices}
              disabled={isLoading}
            >
              <FiRefreshCw className={`me-1 ${isLoading ? 'spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        <div className="card-body">
          {isLoading && devices.length === 0 ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3">Loading devices...</p>
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-5">
              <FiInfo size={48} className="text-muted mb-3" />
              <h5>No O.MG Cables registered yet</h5>
              <p className="text-muted">Register a new device to get started</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Connection</th>
                    <th>Status</th>
                    <th>Last Check-in</th>
                    <th>Firmware</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map(device => (
                    <tr key={device.id}>
                      <td>{device.name}</td>
                      <td>{getConnectionTypeBadge(device.connectionType)}</td>
                      <td>{getStatusBadge(device.status, device)}</td>
                      <td>{formatDateTime(device.lastCheckIn)}</td>
                      <td>{device.firmwareVersion || 'Unknown'}</td>
                      <td>
                        <button 
                          className="btn btn-sm btn-outline-info me-2"
                          onClick={() => handleViewDeviceDetails(device)}
                        >
                          <FiEye className="me-1" /> Details
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
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Register Network O.MG Cable</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                ></button>
              </div>
              <form onSubmit={registerDevice}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="name" className="form-label">Device Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="ipAddress" className="form-label">IP Address</label>
                    <input
                      type="text"
                      className="form-control"
                      id="ipAddress"
                      name="ipAddress"
                      placeholder="192.168.1.100"
                      value={formData.ipAddress}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="firmwareVersion" className="form-label">Firmware Version (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      id="firmwareVersion"
                      name="firmwareVersion"
                      placeholder="1.0.0"
                      value={formData.firmwareVersion}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
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
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Register USB O.MG Cable</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setIsUsbModalOpen(false);
                    resetUsbForm();
                  }}
                ></button>
              </div>
              <form onSubmit={registerUsbDevice}>
                <div className="modal-body">
                  <div className="alert alert-info">
                    <FiInfo className="me-2" />
                    You will be prompted to select your O.MG Cable from the USB devices list after clicking "Register Device".
                  </div>
                  <div className="mb-3">
                    <label htmlFor="usbName" className="form-label">Device Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="usbName"
                      name="name"
                      value={usbFormData.name}
                      onChange={handleUsbInputChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="usbFirmwareVersion" className="form-label">Firmware Version (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      id="usbFirmwareVersion"
                      name="firmwareVersion"
                      placeholder="1.0.0"
                      value={usbFormData.firmwareVersion}
                      onChange={handleUsbInputChange}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setIsUsbModalOpen(false);
                      resetUsbForm();
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
      
      {/* Device Details Modal */}
      {selectedDevice && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Device Details: {selectedDevice.name}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={handleCloseDeviceDetails}
                ></button>
              </div>
              <div className="modal-body">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManagement;
