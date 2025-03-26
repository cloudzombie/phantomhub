import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { FiSave, FiCode, FiZap, FiInfo, FiAlertCircle, FiCheckCircle, FiRefreshCw, FiHardDrive, FiWifi, FiUpload, FiLink, FiList, FiFile, FiTrash2, FiPlusCircle, FiX, FiEdit2, FiEdit, FiCheck } from 'react-icons/fi';
import axios from 'axios';
import * as monaco from 'monaco-editor';
import { registerDuckyScriptLanguage } from '../utils/duckyScriptLanguage';
import { 
  isWebSerialSupported, 
  getConnectedDevices, 
  deployPayload as deployPayloadToUsbDevice,
  type OMGDeviceInfo,
  connectToDevice,
  requestSerialPort,
  DEFAULT_SERIAL_OPTIONS
} from '../utils/webSerialUtils';

const API_URL = 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api';

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

interface Payload {
  id: string;
  name: string;
  script: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

interface Script {
  id: string;
  name: string;
  content: string;
  type: 'callback' | 'exfiltration' | 'command' | 'custom';
  description: string | null;
  isPublic: boolean;
  endpoint: string | null;
  callbackUrl: string | null;
  lastExecuted: string | null;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

const PayloadEditor = () => {
  const [payloadName, setPayloadName] = useState('New Payload');
  const [payloads, setPayloads] = useState<Payload[]>([]);
  const [selectedPayload, setSelectedPayload] = useState<Payload | null>(null);
  const [showPayloadList, setShowPayloadList] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [webSerialSupported, setWebSerialSupported] = useState(false);
  const [usbDevices, setUsbDevices] = useState<OMGDeviceInfo[]>([]);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  
  // Scripts state
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScripts, setSelectedScripts] = useState<string[]>([]);
  const [showScriptList, setShowScriptList] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptFormData, setScriptFormData] = useState({
    name: '',
    type: 'callback',
    description: '',
    content: '',
    isPublic: false,
    callbackUrl: ''
  });
  const [fileContent, setFileContent] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Add this near the other state declarations
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [showScriptEditorModal, setShowScriptEditorModal] = useState(false);
  const [scriptEditorContent, setScriptEditorContent] = useState('');
  const [renamePayloadId, setRenamePayloadId] = useState<string | null>(null);
  const [newPayloadName, setNewPayloadName] = useState('');
  
  // Add this state near other state declarations
  const [userRole, setUserRole] = useState<string>('user');
  
  useEffect(() => {
    // Check if WebSerial is supported
    setWebSerialSupported(isWebSerialSupported());
    
    // Register the DuckyScript language
    registerDuckyScriptLanguage();
    
    // Fetch available devices
    fetchDevices();
    
    // Fetch available payloads
    fetchPayloads();
    
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
    
    // Fetch available scripts
    fetchScripts();
    
    // Get user role when component mounts
    setUserRole(getCurrentUserRole());
    
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
  
  const fetchPayloads = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        window.location.href = '/login';
        return;
      }
      
      const response = await axios.get(`${API_URL}/payloads`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        const fetchedPayloads = response.data.data || [];
        setPayloads(fetchedPayloads);
      }
    } catch (error) {
      console.error('Error fetching payloads:', error);
      
      // If we get a 401, redirect to login
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
  };
  
  const fetchScripts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        window.location.href = '/login';
        return;
      }
      
      const response = await axios.get(`${API_URL}/scripts`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        setScripts(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching scripts:', error);
      
      // If we get a 401, redirect to login
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
  };
  
  const fetchScriptsForPayload = async (payloadId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        window.location.href = '/login';
        return;
      }
      
      const response = await axios.get(`${API_URL}/scripts/payload/${payloadId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        const payloadScripts = response.data.data || [];
        // Set the selected scripts based on what's associated with this payload
        setSelectedScripts(payloadScripts.map((script: Script) => script.id));
      }
    } catch (error) {
      console.error('Error fetching scripts for payload:', error);
    }
  };
  
  const loadPayload = (payload: Payload) => {
    if (editorRef.current) {
      setPayloadName(payload.name);
      editorRef.current.setValue(payload.script);
      setSelectedPayload(payload);
      setShowPayloadList(false);
      
      // Fetch scripts associated with this payload
      fetchScriptsForPayload(payload.id);
    }
  };
  
  const createNewPayload = () => {
    if (editorRef.current) {
      setPayloadName('New Payload');
      editorRef.current.setValue(DEFAULT_DUCKY_SCRIPT);
      setSelectedPayload(null);
      setShowPayloadList(false);
    }
  };
  
  const deletePayload = async (payloadId: string) => {
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        window.location.href = '/login';
        return;
      }
      
      console.log(`Deleting payload with ID: ${payloadId}`);
      
      // Get user data to check role
      const userData = localStorage.getItem('user');
      let userRole = 'user';
      if (userData) {
        try {
          const user = JSON.parse(userData);
          userRole = user.role;
          console.log('User role from localStorage:', userRole);
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
      
      // Check if user has permission to delete
      const currentUser = getCurrentUserFromStorage();
      const payload = payloads.find(p => p.id === payloadId);
      
      if (!payload) {
        setMessage({
          type: 'error',
          text: 'Payload not found'
        });
        return;
      }
      
      const isOwner = currentUser?.id === payload.userId;
      const isAdmin = userRole === 'admin';
      const isOperator = userRole === 'operator';
      
      if (!isOwner && !isAdmin && !isOperator) {
        setMessage({
          type: 'error',
          text: 'You do not have permission to delete this payload'
        });
        return;
      }
      
      try {
        const response = await axios.delete(`${API_URL}/payloads/${payloadId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Delete payload response:', response.data);
        
        if (response.data && response.data.success) {
          setMessage({
            type: 'success',
            text: 'Payload deleted successfully'
          });
          
          // Remove the deleted payload from the state
          setPayloads(prevPayloads => prevPayloads.filter(payload => payload.id !== payloadId));
          
          // If the deleted payload was selected, clear the selection
          if (selectedPayload && selectedPayload.id === payloadId) {
            setSelectedPayload(null);
            setPayloadName('New Payload');
            if (editorRef.current) {
              editorRef.current.setValue(DEFAULT_DUCKY_SCRIPT);
            }
          }
        } else {
          setMessage({
            type: 'error',
            text: response.data?.message || 'Failed to delete payload'
          });
        }
      } catch (error) {
        console.error('Error deleting payload:', error);
        
        // Enhanced error logging
        if (axios.isAxiosError(error)) {
          console.error('API Error Status:', error.response?.status);
          console.error('API Error Data:', error.response?.data);
          
          // Give more specific error messages based on status code
          if (error.response?.status === 403) {
            setMessage({
              type: 'error',
              text: 'You do not have permission to delete this payload. Only operators and admins can delete payloads.'
            });
          } else if (error.response?.status === 401) {
            setMessage({
              type: 'error',
              text: 'Authentication failed. Please log in again.'
            });
            localStorage.removeItem('token');
            window.location.href = '/login';
          } else {
            setMessage({
              type: 'error',
              text: error.response?.data?.message || 'Failed to delete payload. Please try again.'
            });
          }
        } else {
          setMessage({
            type: 'error',
            text: 'Failed to delete payload. Please try again.'
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteClick = (payload: Payload, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the payload selection
    
    if (window.confirm(`Are you sure you want to delete "${payload.name}"? This action cannot be undone.`)) {
      deletePayload(payload.id);
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
      
      let response;
      
      // If we have a selected payload, update it, otherwise create a new one
      if (selectedPayload) {
        response = await axios.put(`${API_URL}/payloads/${selectedPayload.id}`, payloadData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      } else {
        response = await axios.post(`${API_URL}/payloads`, payloadData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }
      
      if (response.data && response.data.success) {
        setMessage({
          type: 'success',
          text: `Payload "${payloadName}" saved successfully!`
        });
        
        // Refresh the payloads list
        fetchPayloads();
        
        // Update the selected payload if we just created one
        if (!selectedPayload) {
          setSelectedPayload(response.data.data);
        }
        
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

  // Create a new script
  const createScript = async () => {
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        window.location.href = '/login';
        return;
      }
      
      // If file was uploaded, use its content instead of the form content
      const finalContent = fileContent || scriptFormData.content;
      
      if (!scriptFormData.name || !finalContent) {
        setMessage({
          type: 'error',
          text: 'Script name and content are required'
        });
        setIsLoading(false);
        return;
      }
      
      const scriptData = {
        name: scriptFormData.name,
        content: finalContent,
        type: scriptFormData.type,
        description: scriptFormData.description || null,
        isPublic: scriptFormData.isPublic,
        callbackUrl: scriptFormData.callbackUrl || null
      };
      
      const response = await axios.post(`${API_URL}/scripts`, scriptData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        setMessage({
          type: 'success',
          text: `Script "${scriptFormData.name}" created successfully!`
        });
        
        // Reset the form
        setScriptFormData({
          name: '',
          type: 'callback',
          description: '',
          content: '',
          isPublic: false,
          callbackUrl: ''
        });
        setFileContent(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Close the modal and refresh scripts
        setShowScriptModal(false);
        fetchScripts();
      } else {
        setMessage({
          type: 'error',
          text: response.data?.message || 'Failed to create script'
        });
      }
    } catch (error) {
      console.error('Error creating script:', error);
      setMessage({
        type: 'error',
        text: 'Failed to create script. Please try again.'
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

  // Handle file upload
  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
    };
    reader.readAsText(file);
  };

  // Handle script form input changes
  const handleScriptInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setScriptFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle checkbox changes
  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setScriptFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  // Toggle script selection
  const toggleScriptSelection = (scriptId: string) => {
    setSelectedScripts(prev => {
      if (prev.includes(scriptId)) {
        return prev.filter(id => id !== scriptId);
      } else {
        return [...prev, scriptId];
      }
    });
  };

  // Associate selected scripts with the current payload
  const associateScriptsWithPayload = async () => {
    try {
      if (!selectedPayload) {
        setMessage({
          type: 'error',
          text: 'Please save a payload first before associating scripts'
        });
        return;
      }
      
      setIsLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        window.location.href = '/login';
        return;
      }
      
      // First, get current scripts associated with the payload
      const currentScripts = await axios.get(`${API_URL}/scripts/payload/${selectedPayload.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const currentScriptIds = currentScripts.data.success ? 
        currentScripts.data.data.map((script: Script) => script.id) : [];
      
      // Scripts to add (selected but not in current)
      const scriptsToAdd = selectedScripts.filter(id => !currentScriptIds.includes(id));
      
      // Scripts to remove (current but not in selected)
      const scriptsToRemove = currentScriptIds.filter((id: string) => !selectedScripts.includes(id));
      
      // Add new associations
      for (const scriptId of scriptsToAdd) {
        await axios.post(`${API_URL}/scripts/associate`, {
          scriptId,
          payloadId: selectedPayload.id,
          executionOrder: 0 // Default execution order
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }
      
      // Remove old associations
      for (const scriptId of scriptsToRemove) {
        await axios.post(`${API_URL}/scripts/disassociate`, {
          scriptId,
          payloadId: selectedPayload.id
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }
      
      setMessage({
        type: 'success',
        text: 'Scripts associated with payload successfully!'
      });
      
      // Close the script list
      setShowScriptList(false);
    } catch (error) {
      console.error('Error associating scripts with payload:', error);
      setMessage({
        type: 'error',
        text: 'Failed to associate scripts with payload'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Deploy payload to connected O.MG Cable
  const deployToDevice = async () => {
    try {
      setIsLoading(true);
      setMessage(null);
      
      if (!editorRef.current) {
        setMessage({
          type: 'error',
          text: 'Editor not initialized'
        });
        return;
      }
      
      // Check if device is selected before deployment
      if (!selectedDevice) {
        setMessage({
          type: 'error',
          text: 'Please select a device before deploying'
        });
        return;
      }
      
      // Get the current payload content
      const payloadContent = editorRef.current.getValue();
      
      if (!payloadContent.trim()) {
        setMessage({
          type: 'error',
          text: 'Cannot deploy empty payload'
        });
        return;
      }
      
      // First save the payload if needed
      if (!selectedPayload) {
        await savePayload();
      } else {
        await savePayload(); // Use savePayload which handles both create and update
      }
      
      // Request access to a serial port
      const port = await requestSerialPort();
      if (!port) {
        setMessage({
          type: 'error',
          text: 'No O.MG cable device selected'
        });
        return;
      }
      
      // Connect to the device
      const deviceInfo = await connectToDevice(port, DEFAULT_SERIAL_OPTIONS);
      if (deviceInfo.connectionStatus !== 'connected') {
        setMessage({
          type: 'error',
          text: 'Failed to connect to O.MG cable'
        });
        return;
      }
      
      // Deploy the payload
      const deployResult = await deployPayloadToUsbDevice(deviceInfo, payloadContent);
      
      if (deployResult.success) {
        setMessage({
          type: 'success',
          text: 'Payload deployed successfully!'
        });
      } else {
        setMessage({
          type: 'error',
          text: `Failed to deploy payload: ${deployResult.message}`
        });
      }
    } catch (error) {
      console.error('Error deploying payload:', error);
      setMessage({
        type: 'error',
        text: `Error deploying payload: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add a new function to delete a script
  const deleteScript = async (scriptId: string) => {
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
      console.log(`Deleting script with ID: ${scriptId}`);
      
      const response = await axios.delete(`${API_URL}/scripts/${scriptId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Delete script response:', response.data);
      
      if (response.data && response.data.success) {
        // Remove the deleted script from state
        setScripts(scripts.filter(script => script.id !== scriptId));
        
        // Also remove from selected scripts if it was selected
        if (selectedScripts.includes(scriptId)) {
          setSelectedScripts(selectedScripts.filter(id => id !== scriptId));
        }
        
        setMessage({
          type: 'success',
          text: 'Script deleted successfully'
        });
      }
    } catch (error) {
      console.error('Error deleting script:', error);
      setMessage({
        type: 'error',
        text: 'Failed to delete script'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle the delete confirmation
  const handleScriptDeleteClick = (scriptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Show confirmation dialog
    if (window.confirm('Are you sure you want to delete this script? This action cannot be undone.')) {
      deleteScript(scriptId);
    }
  };
  
  const openScriptEditor = async (script: Script) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        window.location.href = '/login';
        return;
      }
      
      // Fetch the script content if needed
      const response = await axios.get(`${API_URL}/scripts/${script.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        const scriptData = response.data.data;
        setEditingScript(scriptData);
        setScriptEditorContent(scriptData.content || '');
        setShowScriptEditorModal(true);
      } else {
        setMessage({
          type: 'error',
          text: response.data?.message || 'Failed to load script'
        });
      }
    } catch (error) {
      console.error('Error loading script:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load script. Please try again.'
      });
      
      // If we get a 401, redirect to login
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
  };

  const saveScriptChanges = async () => {
    try {
      if (!editingScript) return;
      
      setIsLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        window.location.href = '/login';
        return;
      }
      
      const scriptData = {
        ...editingScript,
        content: scriptEditorContent
      };
      
      const response = await axios.put(`${API_URL}/scripts/${editingScript.id}`, scriptData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        setMessage({
          type: 'success',
          text: `Script "${editingScript.name}" updated successfully!`
        });
        
        // Close the modal and refresh scripts
        setShowScriptEditorModal(false);
        fetchScripts();
      } else {
        setMessage({
          type: 'error',
          text: response.data?.message || 'Failed to update script'
        });
      }
    } catch (error) {
      console.error('Error updating script:', error);
      setMessage({
        type: 'error',
        text: 'Failed to update script. Please try again.'
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

  const startPayloadRename = (payload: Payload, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the payload selection
    setRenamePayloadId(payload.id);
    setNewPayloadName(payload.name);
  };

  const savePayloadRename = async (payloadId: string) => {
    try {
      if (!newPayloadName.trim()) {
        setMessage({
          type: 'error',
          text: 'Payload name cannot be empty'
        });
        return;
      }
      
      setIsLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        window.location.href = '/login';
        return;
      }
      
      // Get the current payload
      const payload = payloads.find(p => p.id === payloadId);
      if (!payload) return;
      
      const payloadData = {
        ...payload,
        name: newPayloadName
      };
      
      const response = await axios.put(`${API_URL}/payloads/${payloadId}`, payloadData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        setMessage({
          type: 'success',
          text: 'Payload renamed successfully'
        });
        
        // Update the local payloads list
        setPayloads(prevPayloads => 
          prevPayloads.map(p => 
            p.id === payloadId ? { ...p, name: newPayloadName } : p
          )
        );
        
        // Update selected payload if it's the one being renamed
        if (selectedPayload && selectedPayload.id === payloadId) {
          setSelectedPayload({ ...selectedPayload, name: newPayloadName });
          setPayloadName(newPayloadName);
        }
        
        // Clear rename state
        setRenamePayloadId(null);
      } else {
        setMessage({
          type: 'error',
          text: response.data?.message || 'Failed to rename payload'
        });
      }
    } catch (error) {
      console.error('Error renaming payload:', error);
      setMessage({
        type: 'error',
        text: 'Failed to rename payload. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add this helper function to get the current user from storage
  const getCurrentUserFromStorage = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        return JSON.parse(userData);
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
    return null;
  };
  
  // Add this function near the top of the component, before it's used
  const getCurrentUserRole = (): string => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.role || 'user';
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
    return 'user';
  };
  
  return (
    <div className="flex flex-col h-full p-6">
      <div className="border-b border-slate-700 pb-6 mb-6">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-white mb-1">Payload Editor</h1>
          <p className="text-sm text-slate-400">Create, edit, and deploy DuckyScript payloads to your O.MG Cables</p>
        </div>
        
        <div className="mt-4 flex flex-col lg:flex-row gap-4">
          <div className="flex flex-col lg:flex-row gap-2 lg:items-center flex-1">
            <div className="relative flex-1 min-w-[250px]">
              <div className="border border-slate-600 rounded-md p-2 flex items-center space-x-2 bg-slate-800">
                <FiCode className="text-slate-400" size={16} />
                <input
                  type="text"
                  value={payloadName}
                  onChange={(e) => setPayloadName(e.target.value)}
                  className="bg-transparent text-white flex-1 outline-none"
                  placeholder="Payload Name"
                />
              </div>
            </div>
            
            <div className="relative min-w-[200px]">
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full px-3 py-2 border bg-slate-800 border-slate-600 rounded-md text-white focus:outline-none"
              >
                <option value="" disabled>Select a device</option>
                {devices.filter(d => d.status === 'online').map(device => (
                  <option key={device.id} value={device.id.toString()}>
                    {getDeviceDisplayName(device)}
                  </option>
                ))}
                {devices.filter(d => d.status === 'online').length === 0 && (
                  <option value="" disabled>No online devices available</option>
                )}
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={savePayload}
              disabled={isLoading}
              className="flex items-center px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md text-blue-500 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <FiRefreshCw className="mr-2 animate-spin" size={16} /> : <FiSave className="mr-2" size={16} />}
              Save
            </button>
            
            <button
              onClick={() => setShowPayloadList(!showPayloadList)}
              disabled={isLoading}
              className="flex items-center px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-md text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiCode className="mr-2" size={16} />
              Payloads
            </button>
            
            <button
              onClick={deployToDevice}
              disabled={isLoading || !selectedDevice}
              className="flex items-center px-3 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-md text-green-500 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <FiRefreshCw className="mr-2 animate-spin" size={16} /> : <FiZap className="mr-2" size={16} />}
              Deploy
            </button>
          </div>
        </div>
        
        {/* Selected Device Indicator */}
        {selectedDevice && (
          <div className="mt-2 flex items-center px-3 py-1.5 bg-slate-700/30 rounded-md w-fit">
            <div className="flex items-center">
              {(() => {
                const device = devices.find(d => d.id.toString() === selectedDevice);
                return device ? (
                  <>
                    <div className={`w-2 h-2 rounded-full mr-2 ${device.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm text-slate-300">Selected: {getDeviceDisplayName(device)}</span>
                  </>
                ) : null;
              })()}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col min-h-0">
        {/* Script Management Row */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setShowScriptList(!showScriptList)}
              className="flex items-center px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-md text-purple-400 text-sm font-medium transition-colors"
            >
              <FiList className="mr-2" size={16} />
              {showScriptList ? 'Hide Scripts' : 'Manage Scripts'}
            </button>
            
            <button
              onClick={() => setShowScriptModal(true)}
              className="flex items-center px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-md text-indigo-400 text-sm font-medium transition-colors"
            >
              <FiPlusCircle className="mr-2" size={16} />
              New Script
            </button>
          </div>
        </div>
        
        {/* Payload List (Hidden by default, shown when "Payloads" button is clicked) */}
        {showPayloadList && (
          <div className="bg-slate-800 border border-slate-700 rounded-md shadow-sm mb-6 overflow-hidden">
            <div className="border-b border-slate-700 px-4 py-2 font-medium text-white">Saved Payloads</div>
            <ul className="max-h-64 overflow-y-auto">
              {payloads.length > 0 ? (
                payloads.map((payload) => (
                  <li
                    key={payload.id}
                    className="border-b border-slate-700 last:border-none hover:bg-slate-700/30"
                  >
                    <div className="px-4 py-2 flex justify-between items-center">
                      {renamePayloadId === payload.id ? (
                        <div className="flex items-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={newPayloadName}
                            onChange={e => setNewPayloadName(e.target.value)}
                            className="font-medium bg-slate-700 text-white px-2 py-1 rounded w-full"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') savePayloadRename(payload.id);
                              if (e.key === 'Escape') setRenamePayloadId(null);
                            }}
                          />
                          <button
                            onClick={() => savePayloadRename(payload.id)}
                            className="ml-2 p-1 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded"
                            title="Save"
                          >
                            <FiCheck size={16} />
                          </button>
                          <button
                            onClick={() => setRenamePayloadId(null)}
                            className="ml-1 p-1 text-slate-400 hover:text-slate-300 hover:bg-slate-500/10 rounded"
                            title="Cancel"
                          >
                            <FiX size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div onClick={() => loadPayload(payload)} className="flex-1 cursor-pointer">
                            <div className="font-medium text-white">{payload.name}</div>
                            {payload.description && (
                              <div className="text-xs text-slate-400 mt-1">{payload.description}</div>
                            )}
                            <div className="text-xs text-slate-500 mt-1">Last updated: {new Date(payload.updatedAt).toLocaleString()}</div>
                          </div>
                          <div className="flex items-center">
                            <button
                              onClick={(e) => startPayloadRename(payload, e)}
                              className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded mr-1"
                              title="Rename Payload"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            {(payload.userId === (getCurrentUserFromStorage()?.id) || userRole === 'admin' || userRole === 'operator') && (
                              <button
                                onClick={(e) => handleDeleteClick(payload, e)}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                                title="Delete Payload"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                ))
              ) : (
                <li className="px-4 py-3 text-center text-slate-400">No payloads saved yet.</li>
              )}
            </ul>
          </div>
        )}
        
        {/* Script List */}
        {showScriptList && (
          <div className="bg-slate-800 border border-slate-700 rounded-md shadow-sm mb-6 overflow-hidden">
            <div className="border-b border-slate-700 px-4 py-2 font-medium text-white flex justify-between items-center">
              <span>Script Library</span>
              <button
                onClick={associateScriptsWithPayload}
                disabled={isLoading || !selectedPayload}
                className="px-3 py-1 text-xs bg-green-500/10 border border-green-500/30 rounded text-green-500 hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <FiRefreshCw className="animate-spin" size={14} /> : 'Apply Selection'}
              </button>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {scripts.length > 0 ? (
                <table className="w-full text-sm text-slate-300">
                  <thead className="bg-slate-700/50 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="w-10 px-4 py-2 text-center">#</th>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Created</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scripts.map(script => (
                      <tr 
                        key={script.id} 
                        className="border-b border-slate-700 hover:bg-slate-700/30"
                      >
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedScripts.includes(script.id)}
                            onChange={() => toggleScriptSelection(script.id)}
                            className="w-4 h-4 text-green-600 bg-slate-700 border-slate-600 rounded focus:ring-green-500"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="font-medium text-white">{script.name}</div>
                          <div className="text-xs text-slate-400">{script.description}</div>
                        </td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-1 text-xs rounded-full bg-slate-700 text-slate-300">
                            {script.type}
                          </span>
                        </td>
                        <td className="px-4 py-2">{new Date(script.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => openScriptEditor(script)}
                              className="p-1 text-blue-400 hover:text-blue-300"
                              title="Edit script"
                            >
                              <FiEdit size={16} />
                            </button>
                            {script.endpoint && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`${API_URL}/scripts/execute/${script.endpoint}`);
                                  setMessage({
                                    type: 'success',
                                    text: 'Endpoint URL copied to clipboard!'
                                  });
                                }}
                                className="p-1 text-blue-400 hover:text-blue-300"
                                title="Copy endpoint URL"
                              >
                                <FiLink size={16} />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleScriptDeleteClick(script.id, e)}
                              className="p-1 text-red-400 hover:text-red-300"
                              title="Delete script"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-center text-slate-500">
                  No scripts found. Create a new script to get started!
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Monaco Editor */}
        <div className="flex flex-col flex-1 min-h-0 mb-6">
          <div className="text-sm font-medium text-slate-300 mb-3">DuckyScript Editor</div>
          <div
            ref={editorContainerRef}
            className="flex-1 border border-slate-700 rounded-md overflow-hidden"
            style={{ minHeight: '300px' }}
          />
        </div>
        
        {/* DuckyScript Editor Tips */}
        <div className="mt-6 bg-slate-800/50 border border-slate-700 rounded-md p-5">
          <div className="flex items-center text-slate-300 mb-3">
            <FiInfo className="mr-2" size={16} />
            <span className="font-medium">DuckyScript Editor Tips</span>
          </div>
          <ul className="text-sm text-slate-400 space-y-1 ml-6 list-disc">
            <li>Use <code className="text-blue-400 bg-slate-700/30 px-1 rounded">DELAY</code> to add pauses in milliseconds</li>
            <li>Use <code className="text-blue-400 bg-slate-700/30 px-1 rounded">STRING</code> to type text</li>
            <li>Use <code className="text-green-400 bg-slate-700/30 px-1 rounded">REM</code> for comments</li>
            <li>Special keys like <code className="text-purple-400 bg-slate-700/30 px-1 rounded">CTRL</code>, <code className="text-purple-400 bg-slate-700/30 px-1 rounded">ALT</code>, <code className="text-purple-400 bg-slate-700/30 px-1 rounded">GUI</code> can be combined</li>
          </ul>
        </div>
        
        {/* Status Message */}
        {message && (
          <div className={`mt-6 p-4 rounded-md ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}>
            <div className="flex items-center">
              {message.type === 'success' ? <FiCheckCircle className="mr-2" size={16} /> : <FiAlertCircle className="mr-2" size={16} />}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Create Script Modal */}
        {showScriptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg w-full max-w-3xl p-6 relative">
              <button 
                onClick={() => setShowScriptModal(false)}
                className="absolute top-3 right-3 text-slate-400 hover:text-white"
              >
                <FiTrash2 size={18} />
              </button>
              <div className="mb-5">
                <h2 className="text-lg font-medium text-white">Create New Script</h2>
                <p className="text-sm text-slate-400">Create a script that can be called back by devices</p>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative border border-slate-600 rounded-md">
                    <label className="absolute -top-2.5 left-2 px-1 bg-slate-800 text-xs font-medium text-slate-400">
                      Script Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={scriptFormData.name}
                      onChange={handleScriptInputChange}
                      placeholder="My Callback Script"
                      className="w-full px-3 py-2 bg-transparent text-white text-sm focus:outline-none"
                    />
                  </div>
                  
                  <div className="relative border border-slate-600 rounded-md">
                    <label className="absolute -top-2.5 left-2 px-1 bg-slate-800 text-xs font-medium text-slate-400">
                      Script Type
                    </label>
                    <select
                      name="type"
                      value={scriptFormData.type}
                      onChange={handleScriptInputChange}
                      className="w-full px-3 py-2 bg-transparent text-white text-sm focus:outline-none"
                    >
                      <option value="callback">Callback</option>
                      <option value="exfiltration">Exfiltration</option>
                      <option value="command">Command</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>
                
                <div className="relative border border-slate-600 rounded-md">
                  <label className="absolute -top-2.5 left-2 px-1 bg-slate-800 text-xs font-medium text-slate-400">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={scriptFormData.description}
                    onChange={handleScriptInputChange}
                    placeholder="A brief description of what this script does"
                    className="w-full px-3 py-2 bg-transparent text-white text-sm focus:outline-none"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative border border-slate-600 rounded-md">
                    <label className="absolute -top-2.5 left-2 px-1 bg-slate-800 text-xs font-medium text-slate-400">
                      Callback URL (optional)
                    </label>
                    <input
                      type="text"
                      name="callbackUrl"
                      value={scriptFormData.callbackUrl}
                      onChange={handleScriptInputChange}
                      placeholder="https://yourdomain.com/callback"
                      className="w-full px-3 py-2 bg-transparent text-white text-sm focus:outline-none"
                    />
                  </div>
                  
                  <div className="py-2 px-3 flex items-center">
                    <input
                      type="checkbox"
                      id="isPublic"
                      name="isPublic"
                      checked={scriptFormData.isPublic}
                      onChange={handleCheckboxChange}
                      className="mr-2 w-4 h-4 text-green-600 bg-slate-700 border-slate-600 rounded focus:ring-green-500"
                    />
                    <label htmlFor="isPublic" className="text-white text-sm">
                      Make script public (available to all users)
                    </label>
                  </div>
                </div>
                
                <div className="relative border border-slate-600 rounded-md">
                  <label className="absolute -top-2.5 left-2 px-1 bg-slate-800 text-xs font-medium text-slate-400">
                    Script Content
                  </label>
                  <textarea
                    name="content"
                    value={fileContent || scriptFormData.content}
                    onChange={handleScriptInputChange}
                    placeholder="Enter your script content here or upload a file"
                    className="w-full h-40 px-3 py-2 bg-transparent text-white text-sm focus:outline-none resize-none"
                    readOnly={fileContent !== null}
                  ></textarea>
                </div>
                
                <div>
                  <label className="block mb-2 text-sm font-medium text-white">
                    Or upload a script file
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-slate-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-medium
                      file:bg-slate-700 file:text-slate-300
                      hover:file:bg-slate-600"
                  />
                </div>
                
                <div className="pt-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowScriptModal(false)}
                    className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-300 hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={createScript}
                    disabled={isLoading || (!scriptFormData.content && !fileContent)}
                    className="px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-md text-sm text-green-500 hover:bg-green-500/20 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? <FiRefreshCw className="mr-2 animate-spin" size={14} /> : <FiSave className="mr-2" size={14} />}
                    Create Script
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Script Editor Modal */}
        {showScriptEditorModal && editingScript && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg w-full max-w-3xl p-6 relative" style={{ height: '80vh' }}>
              <button 
                onClick={() => setShowScriptEditorModal(false)}
                className="absolute top-3 right-3 text-slate-400 hover:text-white"
              >
                <FiX size={18} />
              </button>
              <div className="mb-5">
                <h2 className="text-lg font-medium text-white">Edit Script: {editingScript.name}</h2>
                <p className="text-sm text-slate-400">{editingScript.type} script</p>
              </div>
              
              <div className="flex flex-col h-full" style={{ height: 'calc(100% - 100px)' }}>
                <textarea
                  value={scriptEditorContent}
                  onChange={(e) => setScriptEditorContent(e.target.value)}
                  className="w-full flex-1 px-4 py-3 bg-slate-900 text-white font-mono text-sm rounded-md border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  style={{ minHeight: '300px' }}
                />
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowScriptEditorModal(false)}
                    className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveScriptChanges}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? <FiRefreshCw className="animate-spin" size={16} /> : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayloadEditor; 