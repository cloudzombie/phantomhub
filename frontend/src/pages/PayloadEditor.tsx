import { useState, useEffect, useRef } from 'react';
import { FiSave, FiCode, FiZap, FiInfo, FiAlertCircle, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import axios from 'axios';
import * as monaco from 'monaco-editor';
import { registerDuckyScriptLanguage } from '../utils/duckyScriptLanguage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Default empty DuckyScript template
const DEFAULT_DUCKY_SCRIPT = `REM DuckyScript Payload Template
REM Replace with your own commands

DELAY 1000
STRING Your payload commands here
ENTER`;

const PayloadEditor = () => {
  const [payloadName, setPayloadName] = useState('New Payload');
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  
  useEffect(() => {
    // Register the DuckyScript language
    registerDuckyScriptLanguage();
    
    // Fetch available devices
    fetchDevices();
    
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
    
    // Cleanup
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, []);
  
  // Clear messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);
  
  const fetchDevices = async () => {
    setIsLoading(true);
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
        // Filter only online devices
        const onlineDevices = response.data.data.filter((device: any) => device.status === 'online');
        setDevices(onlineDevices);
        
        // Select first device if available and none selected
        if (onlineDevices.length > 0 && !selectedDevice) {
          setSelectedDevice(onlineDevices[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load devices. Please check your connection.'
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
  
  const savePayload = async () => {
    try {
      if (!editorRef.current) return;
      
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        window.location.href = '/login';
        return;
      }
      
      const payload = {
        name: payloadName,
        script: editorRef.current.getValue(),
        description: 'Created in Payload Editor'
      };
      
      const response = await axios.post(`${API_URL}/payloads`, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        setMessage({
          type: 'success',
          text: 'Payload saved successfully!'
        });
        return response.data.data;
      }
      
      return null;
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
      if (!editorRef.current || !selectedDevice) {
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
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        window.location.href = '/login';
        return;
      }
      
      // Deploy the payload to the selected device
      const deploymentData = {
        payloadId: savedPayload.id,
        deviceId: parseInt(selectedDevice)
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
  
  return (
    <div className="p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Payload Editor</h1>
        <p className="text-sm text-slate-400">Create and deploy DuckyScript payloads to your connected devices</p>
      </div>
      
      {/* Status Messages */}
      {message && (
        <div className={`mb-5 p-3 rounded text-sm flex items-center ${
          message.type === 'success' 
            ? 'bg-green-900/20 border border-green-500/30 text-green-400' 
            : 'bg-red-900/20 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? (
            <FiCheckCircle className="mr-2 flex-shrink-0" size={16} />
          ) : (
            <FiAlertCircle className="mr-2 flex-shrink-0" size={16} />
          )}
          <p>{message.text}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 mb-6">
        <div className="lg:col-span-4">
          <div className="relative border border-slate-600 rounded-md">
            <label className="absolute -top-2.5 left-2 px-1 bg-slate-900 text-xs font-medium text-slate-400">
              Payload Name
            </label>
            <input 
              value={payloadName}
              onChange={(e) => setPayloadName(e.target.value)}
              placeholder="Enter a descriptive name for your payload"
              className="w-full px-3 py-2 bg-transparent text-white text-sm focus:outline-none"
            />
          </div>
        </div>
        
        <div className="lg:col-span-2">
          <div className="relative border border-slate-600 rounded-md">
            <label className="absolute -top-2.5 left-2 px-1 bg-slate-900 text-xs font-medium text-slate-400">
              Target Device
            </label>
            <select 
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full px-3 py-2 bg-transparent text-white text-sm focus:outline-none appearance-none"
            >
              <option value="" disabled>Select a device</option>
              {devices.length === 0 && (
                <option value="" disabled>No online devices available</option>
              )}
              {devices.map(device => (
                <option key={device.id} value={device.id}>
                  {device.name} ({device.ipAddress})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-medium text-white flex items-center">
          <FiCode className="mr-2 text-green-500" size={16} />
          DuckyScript Editor
        </h2>
        
        <div className="flex gap-3">
          <button 
            onClick={fetchDevices}
            className="inline-flex items-center px-3 py-2 text-xs bg-slate-700/50 text-slate-300 border border-slate-600/50 rounded hover:bg-slate-700 transition-colors"
            disabled={isLoading}
          >
            <FiRefreshCw className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} size={14} />
            Refresh Devices
          </button>
          <button 
            onClick={savePayload}
            className="inline-flex items-center px-3 py-2 text-xs bg-slate-700/50 text-slate-300 border border-slate-600/50 rounded hover:bg-slate-700 transition-colors"
            disabled={isLoading}
          >
            <FiSave className="mr-2" size={14} />
            Save Payload
          </button>
          <button 
            onClick={deployPayload}
            className="inline-flex items-center px-3 py-2 text-xs bg-green-500/10 text-green-500 border border-green-500/30 rounded hover:bg-green-500/20 transition-colors"
            disabled={isLoading || !selectedDevice}
          >
            <FiZap className="mr-2" size={14} />
            Deploy to Device
          </button>
        </div>
      </div>
      
      <div className="bg-slate-800 border border-slate-700 rounded-md shadow-sm overflow-hidden mb-6">
        <div 
          ref={editorContainerRef} 
          className="h-[500px]"
        />
      </div>
      
      <div className="bg-slate-800 border border-slate-700 rounded-md p-4 shadow-sm">
        <h3 className="text-sm font-medium text-white flex items-center mb-2">
          <FiInfo className="mr-2 text-green-500" size={16} />
          DuckyScript Reference
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          DuckyScript is a simple scripting language for programming keystroke injection payloads. Here are some common commands:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-slate-700/30 border border-slate-600/50 rounded">
            <div className="font-mono text-xs text-green-500 mb-1">REM [comment]</div>
            <p className="text-xs text-slate-400">Adds a comment (not executed)</p>
          </div>
          <div className="p-3 bg-slate-700/30 border border-slate-600/50 rounded">
            <div className="font-mono text-xs text-green-500 mb-1">DELAY [ms]</div>
            <p className="text-xs text-slate-400">Pauses execution for milliseconds</p>
          </div>
          <div className="p-3 bg-slate-700/30 border border-slate-600/50 rounded">
            <div className="font-mono text-xs text-green-500 mb-1">STRING [text]</div>
            <p className="text-xs text-slate-400">Types the specified text</p>
          </div>
          <div className="p-3 bg-slate-700/30 border border-slate-600/50 rounded">
            <div className="font-mono text-xs text-green-500 mb-1">ENTER, TAB, ESC</div>
            <p className="text-xs text-slate-400">Simulates pressing special keys</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayloadEditor; 