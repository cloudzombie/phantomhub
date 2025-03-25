import { useState, useEffect, useRef } from 'react';
import { FiSave, FiCode, FiZap, FiInfo, FiAlertCircle, FiCheckCircle, FiRefreshCw, FiHardDrive, FiWifi } from 'react-icons/fi';
import axios from 'axios';
import * as monaco from 'monaco-editor';
import { registerDuckyScriptLanguage } from '../utils/duckyScriptLanguage';
import { 
  isWebSerialSupported, 
  getConnectedDevices, 
  deployPayload as deployPayloadToUsbDevice,
  type OMGDeviceInfo
} from '../utils/webSerialUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Default empty DuckyScript template
const DEFAULT_DUCKY_SCRIPT = `REM DuckyScript Payload Template
REM Replace with your own commands

DELAY 1000
STRING Your payload commands here
ENTER`;

interface Device {
  id: number;
  name: string;
  ipAddress: string;
  firmwareVersion: string | null;
  status: 'online' | 'offline' | 'busy';
  connectionType?: 'network' | 'usb'; 
  serialPortId?: string;
}

const PayloadEditor = () => {
  const [payloadName, setPayloadName] = useState('New Payload');
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [webSerialSupported, setWebSerialSupported] = useState(false);
  const [usbDevices, setUsbDevices] = useState<OMGDeviceInfo[]>([]);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  
  useEffect(() => {
    // Check if WebSerial is supported
    setWebSerialSupported(isWebSerialSupported());
    
    // Register the DuckyScript language
    registerDuckyScriptLanguage();
    
    // Fetch available devices
    fetchDevices();
    
    // Get any already connected USB devices
    if (isWebSerialSupported()) {
      checkUsbDevices();
    }
    
    // Initialize Monaco Editor
    if (editorContainerRef.current) {
      editorRef.current = monaco.editor.create(editorContainerRef.current, {
        value: DEFAULT_DUCKY_SCRIPT,
        language: 'duckyscript', // Use our custom language
        theme: 'duckyscript-theme', // Use our custom theme
        minimap: { enabled: true },
        automaticLayout: true,
        fontSize: 14,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        lineNumbers: 'on',
        glyphMargin: true,
        folding: true,
        lineDecorationsWidth: 10,
        suggestOnTriggerCharacters: true,
      });
    }
    
    // Setup interval to refresh USB devices
    const intervalId = setInterval(() => {
      if (isWebSerialSupported()) {
        checkUsbDevices();
      }
    }, 5000);
    
    // Cleanup
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
      clearInterval(intervalId);
    };
  }, []);
  
  const checkUsbDevices = () => {
    try {
      const devices = getConnectedDevices();
      setUsbDevices(devices);
    } catch (error) {
      console.error('Error checking USB devices:', error);
    }
  };
  
  const fetchDevices = async () => {
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
        const fetchedDevices = response.data.data || [];
        setDevices(fetchedDevices);
        
        // Select first device if available and none selected
        if (fetchedDevices.length > 0 && !selectedDevice) {
          const onlineDevice = fetchedDevices.find((d: Device) => d.status === 'online');
          if (onlineDevice) {
            setSelectedDevice(onlineDevice.id.toString());
          }
        }
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      setMessage({
        type: 'error',
        text: 'Failed to fetch devices. Please try again.'
      });
      
      // If we get a 401, redirect to login
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
  };
  
  const savePayload = async () => {
    try {
      if (!editorRef.current) {
        setMessage({
          type: 'error',
          text: 'Editor not ready'
        });
        return null;
      }
      
      setIsLoading(true);
      
      const payloadScript = editorRef.current.getValue();
      
      if (!payloadScript.trim()) {
        setMessage({
          type: 'error',
          text: 'Payload cannot be empty'
        });
        setIsLoading(false);
        return null;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        window.location.href = '/login';
        return null;
      }
      
      const payloadData = {
        name: payloadName,
        script: payloadScript,
        type: 'duckyscript'
      };
      
      const response = await axios.post(`${API_URL}/payloads`, payloadData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        setMessage({
          type: 'success',
          text: `Payload "${payloadName}" saved successfully!`
        });
        return response.data.data;
      } else {
        setMessage({
          type: 'error',
          text: response.data?.message || 'Failed to save payload'
        });
        return null;
      }
    } catch (error) {
      console.error('Error saving payload:', error);
      setMessage({
        type: 'error',
        text: 'Failed to save payload. Please try again.'
      });
      
      // If we get a 401, redirect to login
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  const deployPayload = async () => {
    try {
      if (!editorRef.current) {
        setMessage({
          type: 'error',
          text: 'Editor not ready'
        });
        return;
      }
      
      if (!selectedDevice) {
        setMessage({
          type: 'error',
          text: 'Please select a device first'
        });
        return;
      }
      
      setIsLoading(true);
      
      // First save the payload to get its ID
      const savedPayload = await savePayload();
      if (!savedPayload) {
        return;
      }
      
      // Find the device to determine if it's USB or network connected
      const device = devices.find(d => d.id.toString() === selectedDevice);
      
      if (device?.connectionType === 'usb') {
        // For USB devices, use WebSerial
        const payloadScript = editorRef.current.getValue();
        
        // Find the connected USB device that matches this device
        const usbDevice = usbDevices.find((d: OMGDeviceInfo) => d.info.deviceId === device.serialPortId);
        
        if (!usbDevice) {
          setMessage({
            type: 'error',
            text: 'USB device is no longer connected. Please reconnect it.'
          });
          return;
        }
        
        // First, create a deployment record on the backend
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          window.location.href = '/login';
          return;
        }
        
        // Initialize the deployment
        const deploymentData = {
          payloadId: savedPayload.id,
          deviceId: parseInt(selectedDevice),
          connectionType: 'usb'
        };
        
        // Create the deployment record
        const deployResponse = await axios.post(`${API_URL}/payloads/deploy`, deploymentData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!deployResponse.data || !deployResponse.data.success) {
          setMessage({
            type: 'error',
            text: deployResponse.data?.message || 'Failed to initialize deployment'
          });
          return;
        }
        
        const deploymentId = deployResponse.data.data.id;
        
        try {
          // Deploy directly via WebSerial - this is the actual physical connection
          const startTime = Date.now();
          const result = await deployPayloadToUsbDevice(usbDevice, payloadScript);
          const executionTime = Date.now() - startTime;
          
          // Now update the backend with the actual result
          const updateData = {
            status: result.success ? 'completed' : 'failed',
            result: {
              success: result.success,
              executionTime,
              output: result.message,
              timestamp: new Date().toISOString()
            }
          };
          
          // Report the actual result back to the backend
          await axios.patch(`${API_URL}/deployments/${deploymentId}`, updateData, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          // Show message to user
          setMessage({
            type: result.success ? 'success' : 'error',
            text: result.success 
              ? 'Payload deployed to USB device successfully!' 
              : `Failed to deploy to USB device: ${result.message}`
          });
        } catch (error) {
          console.error('Error in USB deployment:', error);
          
          // Report failure to backend
          await axios.patch(`${API_URL}/deployments/${deploymentId}`, {
            status: 'failed',
            result: {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error during USB deployment',
              timestamp: new Date().toISOString()
            }
          }, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          setMessage({
            type: 'error',
            text: `USB deployment error: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      } else {
        // For network devices, use the API
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          window.location.href = '/login';
          return;
        }
        
        // Deploy the payload to the selected device
        const deploymentData = {
          payloadId: savedPayload.id,
          deviceId: parseInt(selectedDevice),
          connectionType: 'network'
        };
        
        const response = await axios.post(`${API_URL}/payloads/deploy`, deploymentData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.data && response.data.success) {
          setMessage({
            type: 'success',
            text: `Payload deployed to device successfully!`
          });
        }
      }
    } catch (error) {
      console.error('Error deploying payload:', error);
      setMessage({
        type: 'error',
        text: 'Failed to deploy payload. Please try again.'
      });
      
      // If we get a 401, redirect to login
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const getDeviceConnectionIcon = (device: Device) => {
    if (device.connectionType === 'usb') {
      return <FiHardDrive className="ml-1" size={12} />;
    }
    return <FiWifi className="ml-1" size={12} />;
  };
  
  // Format the device display name with connection type indicator
  const getDeviceDisplayName = (device: Device) => {
    if (device.connectionType === 'usb') {
      return `${device.name} (USB)`;
    }
    return `${device.name} (WiFi)`;
  };
  
  return (
    <div className="p-6 h-full flex flex-col">
      {/* Page Title */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-white">Payload Editor</h1>
        <p className="text-sm text-slate-400">Create, edit, and deploy DuckyScript payloads to your O.MG Cables</p>
      </div>
      
      {/* Status Messages */}
      {message && (
        <div className={`mb-4 p-3 rounded text-sm ${
          message.type === 'success' 
            ? 'bg-green-900/20 border border-green-500/30 text-green-400' 
            : 'bg-red-900/20 border border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' 
              ? <FiCheckCircle className="mr-2 flex-shrink-0" size={16} />
              : <FiAlertCircle className="mr-2 flex-shrink-0" size={16} />
            }
            <p>{message.text}</p>
          </div>
        </div>
      )}
      
      {/* Editor Controls */}
      <div className="bg-slate-800 border border-slate-700 rounded-md shadow-sm mb-4 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiCode className="text-slate-400" size={16} />
            </div>
            <input
              type="text"
              value={payloadName}
              onChange={(e) => setPayloadName(e.target.value)}
              placeholder="Payload Name"
              className="w-full pl-10 pr-3 py-2 border bg-slate-700/50 border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500/50"
            />
          </div>
          
          <div className="relative flex-grow max-w-md">
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full px-3 py-2 border bg-slate-700/50 border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500/50"
            >
              <option value="" disabled>Select a device</option>
              {devices.filter(d => d.status === 'online').map(device => (
                <option key={device.id} value={device.id}>
                  {getDeviceDisplayName(device)}
                </option>
              ))}
              {devices.filter(d => d.status === 'online').length === 0 && (
                <option value="" disabled>No online devices available</option>
              )}
            </select>
            {selectedDevice && (
              <div className="mt-1 text-xs text-slate-400 flex items-center">
                Selected: {devices.find(d => d.id.toString() === selectedDevice)?.name} 
                {selectedDevice && devices.find(d => d.id.toString() === selectedDevice) && (
                  <span className="ml-1 flex items-center">
                    {getDeviceConnectionIcon(devices.find(d => d.id.toString() === selectedDevice)!)}
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={savePayload}
              disabled={isLoading}
              className="flex items-center px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-md text-white text-sm font-medium transition-colors"
            >
              {isLoading ? <FiRefreshCw className="mr-2 animate-spin" size={16} /> : <FiSave className="mr-2" size={16} />}
              Save
            </button>
            
            <button
              onClick={deployPayload}
              disabled={isLoading || !selectedDevice}
              className="flex items-center px-3 py-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/30 rounded-md text-sm font-medium transition-colors"
            >
              {isLoading ? <FiRefreshCw className="mr-2 animate-spin" size={16} /> : <FiZap className="mr-2" size={16} />}
              Deploy
            </button>
          </div>
        </div>
      </div>
      
      {/* Warning for browsers without WebSerial support */}
      {!webSerialSupported && (
        <div className="mb-4 p-3 bg-orange-900/20 border border-orange-500/30 rounded text-orange-400 text-sm">
          <div className="flex items-center">
            <FiInfo className="mr-2 flex-shrink-0" size={16} />
            <p>USB device connections are not supported in this browser. For direct USB connectivity, use Google Chrome or Microsoft Edge.</p>
          </div>
        </div>
      )}
      
      {/* Editor Container */}
      <div className="bg-slate-800 border border-slate-700 rounded-md shadow-sm overflow-hidden mb-6">
        <div className="border-b border-slate-700 px-4 py-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-white">DuckyScript Editor</h2>
        </div>
        <div ref={editorContainerRef} className="h-[500px]"></div>
      </div>
      
      {/* Editor Info */}
      <div className="mt-auto bg-slate-800 border border-slate-700 rounded-md p-4 text-sm text-slate-400">
        <h3 className="font-medium text-white mb-2 flex items-center">
          <FiInfo className="mr-2 text-green-500" size={16} />
          DuckyScript Editor Tips
        </h3>
        <ul className="space-y-1 list-disc pl-5">
          <li>Use <code className="bg-slate-700/50 px-1 rounded">DELAY</code> to add pauses in milliseconds</li>
          <li>Use <code className="bg-slate-700/50 px-1 rounded">STRING</code> to type text</li>
          <li>Use <code className="bg-slate-700/50 px-1 rounded">REM</code> for comments</li>
          <li>Special keys like <code className="bg-slate-700/50 px-1 rounded">CTRL</code>, <code className="bg-slate-700/50 px-1 rounded">ALT</code>, <code className="bg-slate-700/50 px-1 rounded">GUI</code> can be combined</li>
        </ul>
      </div>
    </div>
  );
};

export default PayloadEditor; 