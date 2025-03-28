import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { FiSave, FiCode, FiZap, FiInfo, FiAlertCircle, FiCheckCircle, FiRefreshCw, FiHardDrive, FiWifi, FiUpload, FiLink, FiList, FiFile, FiTrash2, FiPlusCircle, FiX, FiEdit2, FiEdit, FiCheck } from 'react-icons/fi';
import axios from 'axios';
import { api } from '../services/api';
import { handleAuthError, isAuthError, getToken, getUserData } from '../utils/tokenManager';
import * as monaco from 'monaco-editor';
import { registerDuckyScriptLanguage } from '../utils/duckyScriptLanguage';
import { observer } from 'mobx-react-lite';
import { useStores } from '../hooks/useStores';
import { 
  isWebSerialSupported, 
  getConnectedDevices, 
  deployPayload as deployPayloadToUsbDevice,
  type OMGDeviceInfo,
  connectToDevice,
  requestSerialPort,
  DEFAULT_SERIAL_OPTIONS
} from '../utils/webSerialUtils';
import { 
  useGetDevicesQuery, 
  useGetPayloadsQuery, 
  useGetScriptsQuery,
  useCreatePayloadMutation,
  useUpdatePayloadMutation,
  useDeletePayloadMutation,
  useDeployPayloadMutation,
  useGetPayloadScriptsQuery,
  useAssociateScriptMutation,
  useDisassociateScriptMutation,
  useCreateScriptMutation,
  useUpdateScriptMutation,
  useDeleteScriptMutation
} from '../core/apiClient';

// Hardcoded Heroku URL for API calls
const API_URL = 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api';

// Default empty DuckyScript template
const DEFAULT_DUCKY_SCRIPT = `REM DuckyScript Payload Template
REM Replace with your own commands

DELAY 1000
STRING Your payload commands here
ENTER`;

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

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

// Add these near the top with other interfaces
interface FetchState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

// Configure Monaco Editor workers
window.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    if (label === 'json') {
      return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(`
        self.MonacoEnvironment = {
          baseUrl: 'https://unpkg.com/monaco-editor@0.52.2/min/'
        };
        importScripts('https://unpkg.com/monaco-editor@0.52.2/min/vs/language/json/json.worker');
      `);
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(`
        self.MonacoEnvironment = {
          baseUrl: 'https://unpkg.com/monaco-editor@0.52.2/min/'
        };
        importScripts('https://unpkg.com/monaco-editor@0.52.2/min/vs/language/css/css.worker');
      `);
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(`
        self.MonacoEnvironment = {
          baseUrl: 'https://unpkg.com/monaco-editor@0.52.2/min/'
        };
        importScripts('https://unpkg.com/monaco-editor@0.52.2/min/vs/language/html/html.worker');
      `);
    }
    if (label === 'typescript' || label === 'javascript') {
      return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(`
        self.MonacoEnvironment = {
          baseUrl: 'https://unpkg.com/monaco-editor@0.52.2/min/'
        };
        importScripts('https://unpkg.com/monaco-editor@0.52.2/min/vs/language/typescript/ts.worker');
      `);
    }
    return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(`
      self.MonacoEnvironment = {
        baseUrl: 'https://unpkg.com/monaco-editor@0.52.2/min/'
      };
      importScripts('https://unpkg.com/monaco-editor@0.52.2/min/vs/editor/editor.worker');
    `);
  }
};

const PayloadEditor = observer(() => {
  // Helper function to get current user from storage
  const getCurrentUserFromStorage = () => {
    try {
      const userData = getUserData();
      // userData is already parsed by getUserData, no need to parse again
      return userData;
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
    return null;
  };
  
  // Helper function to get current user role
  const getCurrentUserRole = (): string => {
    try {
      const userData = getUserData();
      if (userData) {
        // userData is already parsed by getUserData, no need to parse again
        return userData.role || 'user';
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
    return 'user';
  };

  const [payloadName, setPayloadName] = useState('New Payload');
  const [payloads, setPayloads] = useState<Payload[]>([]);
  const [selectedPayload, setSelectedPayload] = useState<Payload | null>(null);
  const [showPayloadList, setShowPayloadList] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [isLoadingState, setIsLoading] = useState(false);
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
  
  // Add these state declarations in the component
  const [devicesFetchState, setDevicesFetchState] = useState<FetchState>({
    isLoading: false,
    error: null,
    lastUpdated: null
  });

  const [payloadsFetchState, setPayloadsFetchState] = useState<FetchState>({
    isLoading: false,
    error: null,
    lastUpdated: null
  });

  const [scriptsFetchState, setScriptsFetchState] = useState<FetchState>({
    isLoading: false,
    error: null,
    lastUpdated: null
  });

  const { devicesStore, payloadsStore, scriptsStore } = useStores();

  // Get MobX stores
  const { deviceStore, payloadStore, scriptStore } = useStores();

  // Use Redux RTK Query hooks
  const { data: devicesData, isLoading: devicesLoading } = useGetDevicesQuery();
  const { data: payloadsData, isLoading: payloadsLoading } = useGetPayloadsQuery();
  const { data: scriptsData, isLoading: scriptsLoading } = useGetScriptsQuery();
  
  // Mutations
  const [createPayloadMutation, { isLoading: isCreatingPayload }] = useCreatePayloadMutation();
  const [updatePayloadMutation, { isLoading: isUpdatingPayload }] = useUpdatePayloadMutation();
  const [deletePayloadMutation, { isLoading: isDeletingPayload }] = useDeletePayloadMutation();
  const [deployPayloadMutation, { isLoading: isDeployingPayload }] = useDeployPayloadMutation();
  
  const [createScriptMutation, { isLoading: isCreatingScript }] = useCreateScriptMutation();
  const [updateScriptMutation, { isLoading: isUpdatingScript }] = useUpdateScriptMutation();
  const [deleteScriptMutation, { isLoading: isDeletingScript }] = useDeleteScriptMutation();

  // Calculate overall loading state
  const isLoading = 
    devicesLoading || 
    payloadsLoading || 
    scriptsLoading ||
    isCreatingPayload ||
    isUpdatingPayload ||
    isDeletingPayload ||
    isDeployingPayload ||
    isCreatingScript ||
    isUpdatingScript ||
    isDeletingScript;

  useEffect(() => {
    // Check if WebSerial is supported
    setWebSerialSupported(isWebSerialSupported());
    
    // Register the DuckyScript language
    registerDuckyScriptLanguage();
    
    // Initialize Monaco Editor
    if (editorContainerRef.current) {
      editorRef.current = monaco.editor.create(editorContainerRef.current, {
        value: DEFAULT_DUCKY_SCRIPT,
        language: 'duckyscript',
        theme: 'duckyscript-theme',
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

    // Get user role when component mounts
    setUserRole(getCurrentUserRole());

    // Cleanup function
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, []);

  // Update local data when API data changes
  useEffect(() => {
    if (devicesData?.success) {
      deviceStore.setDevices(devicesData.data);
      
      // Auto-select first online device if none selected
      if (!selectedDevice && devicesData.data.length > 0) {
        const onlineDevice = devicesData.data.find(d => d.status === 'online');
        if (onlineDevice) {
          setSelectedDevice(onlineDevice.id.toString());
        }
      }
    }
  }, [devicesData, deviceStore, selectedDevice]);

  useEffect(() => {
    if (payloadsData?.success) {
      payloadStore.setPayloads(payloadsData.data);
    }
  }, [payloadsData, payloadStore]);

  useEffect(() => {
    if (scriptsData?.success) {
      scriptStore.setScripts(scriptsData.data);
    }
  }, [scriptsData, scriptStore]);

  // Handle selected payload scripts
  const { data: selectedPayloadScripts } = useGetPayloadScriptsQuery(
    selectedPayload?.id || '', 
    { skip: !selectedPayload }
  );

  useEffect(() => {
    if (selectedPayloadScripts?.success) {
      setSelectedScripts(selectedPayloadScripts.data.map(script => script.id));
    }
  }, [selectedPayloadScripts]);

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
      setDevicesFetchState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const token = getToken();
      if (!token) {
        // Don't redirect, just update state
        setDevicesFetchState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Authentication required'
        }));
        return;
      }
      
      const response = await api.get<ApiResponse<Device[]>>('/devices');
      
      if (response.data?.success) {
        const fetchedDevices = response.data.data || [];
        setDevices(fetchedDevices as Device[]);
        
        // Only select first device if we don't have one selected
        if (fetchedDevices.length > 0 && !selectedDevice) {
          const onlineDevice = fetchedDevices.find((d: Device) => d.status === 'online');
          if (onlineDevice) {
            setSelectedDevice(onlineDevice.id.toString());
          }
        }
        
        setDevicesFetchState({
          isLoading: false,
          error: null,
          lastUpdated: Date.now()
        });
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      
      if (isAuthError(error)) {
        // Handle auth errors without disrupting the UI
        setDevicesFetchState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Session expired. Please refresh your authentication.'
        }));
        
        // Let the auth handler deal with the token
        handleAuthError(error, 'Authentication error');
      } else if (axios.isAxiosError(error)) {
        // Handle different HTTP errors appropriately
        switch (error.response?.status) {
          case 500:
            setDevices([]);
            setDevicesFetchState(prev => ({
              ...prev,
              isLoading: false,
              error: null // Don't show error for empty state
            }));
            break;
          case 403:
            setDevicesFetchState(prev => ({
              ...prev,
              isLoading: false,
              error: 'You do not have permission to view devices'
            }));
            break;
          default:
            setDevicesFetchState(prev => ({
              ...prev,
              isLoading: false,
              error: 'Failed to fetch devices. Please try again.'
            }));
        }
      }
    }
  };
  
  const fetchPayloads = async () => {
    try {
      setPayloadsFetchState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const token = getToken();
      if (!token) {
        setPayloadsFetchState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Authentication required'
        }));
        return;
      }
      
      const response = await api.get<ApiResponse<Payload[]>>('/payloads');
      
      if (response.data?.success) {
        const fetchedPayloads = response.data.data || [];
        setPayloads(fetchedPayloads as Payload[]);
        
        setPayloadsFetchState({
          isLoading: false,
          error: null,
          lastUpdated: Date.now()
        });
      }
    } catch (error) {
      console.error('Error fetching payloads:', error);
      
      if (isAuthError(error)) {
        setPayloadsFetchState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Session expired. Please refresh your authentication.'
        }));
        handleAuthError(error, 'Authentication error');
      } else if (axios.isAxiosError(error)) {
        switch (error.response?.status) {
          case 500:
            setPayloads([]);
            setPayloadsFetchState(prev => ({
              ...prev,
              isLoading: false,
              error: null
            }));
            break;
          case 403:
            setPayloadsFetchState(prev => ({
              ...prev,
              isLoading: false,
              error: 'You do not have permission to view payloads'
            }));
            break;
          default:
            setPayloadsFetchState(prev => ({
              ...prev,
              isLoading: false,
              error: 'Failed to fetch payloads. Please try again.'
            }));
        }
      }
    }
  };
  
  const fetchScripts = async () => {
    try {
      setScriptsFetchState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const token = getToken();
      if (!token) {
        setScriptsFetchState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Authentication required'
        }));
        return;
      }
      
      const response = await api.get<ApiResponse<Script[]>>('/scripts');
      
      if (response.data?.success) {
        const fetchedScripts = response.data.data || [];
        setScripts(fetchedScripts as Script[]);
        
        setScriptsFetchState({
          isLoading: false,
          error: null,
          lastUpdated: Date.now()
        });
      }
    } catch (error) {
      console.error('Error fetching scripts:', error);
      
      if (isAuthError(error)) {
        setScriptsFetchState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Session expired. Please refresh your authentication.'
        }));
        handleAuthError(error, 'Authentication error');
      } else if (axios.isAxiosError(error)) {
        switch (error.response?.status) {
          case 500:
            setScripts([]);
            setScriptsFetchState(prev => ({
              ...prev,
              isLoading: false,
              error: null
            }));
            break;
          case 403:
            setScriptsFetchState(prev => ({
              ...prev,
              isLoading: false,
              error: 'You do not have permission to view scripts'
            }));
            break;
          default:
            setScriptsFetchState(prev => ({
              ...prev,
              isLoading: false,
              error: 'Failed to fetch scripts. Please try again.'
            }));
        }
      }
    }
  };
  
  const fetchScriptsForPayload = async (payloadId: string) => {
    try {
      const token = getToken();
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
  
  const handleDeletePayload = async (payloadId: string) => {
    try {
      setIsLoading(true);
      const result = await deletePayloadMutation(payloadId).unwrap();

      if (result.success) {
        setMessage({ type: 'success', text: 'Payload deleted successfully' });
        
        // If the deleted payload was selected, clear the selection
        if (selectedPayload && selectedPayload.id === payloadId) {
          setSelectedPayload(null);
          setPayloadName('New Payload');
          
          // Reset the editor content
          if (editorRef.current) {
            editorRef.current.setValue(DEFAULT_DUCKY_SCRIPT);
          }
        }
        
        // Refetch payloads
        setIsLoading(true);
        await fetchPayloads();
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to delete payload' });
      }
    } catch (error) {
      console.error('Error deleting payload:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleAuthError('Your session has expired. Please log in again.');
      } else {
        setMessage({ 
          type: 'error', 
          text: error instanceof Error ? error.message : 'An unknown error occurred while deleting the payload'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const savePayload = async () => {
    try {
      if (!editorRef.current) {
        setMessage({ type: 'error', text: 'Editor not initialized' });
        return null;
      }
      
      const script = editorRef.current.getValue();
      if (!script || script.trim() === '') {
        setMessage({ type: 'error', text: 'Payload content cannot be empty' });
        return null;
      }
      
      if (!payloadName || payloadName.trim() === '') {
        setMessage({ type: 'error', text: 'Payload name cannot be empty' });
        return null;
      }
      
      setIsLoading(true);
      
      // Create the payload object
      const payloadData = {
        name: payloadName,
        script: script,
        description: '', // Can be updated to use an actual description field
      };
      
      let response;
      
      // If we have a selected payload, update it, otherwise create a new one
      if (selectedPayload) {
        response = await updatePayloadMutation({ 
          id: selectedPayload.id, 
          payload: payloadData 
        }).unwrap();
      } else {
        response = await createPayloadMutation(payloadData).unwrap();
      }
      
      if (response.success) {
        setMessage({
          type: 'success',
          text: `Payload "${payloadName}" saved successfully!`
        });
        
        // Refresh the payloads list
        fetchPayloads();
        
        // Update the selected payload if we just created one
        if (!selectedPayload) {
          setSelectedPayload(response.data);
        }
        
        return response.data;
      } else {
        setMessage({
          type: 'error',
          text: response.message || 'Failed to save payload'
        });
        return null;
      }
    } catch (error) {
      console.error('Error saving payload:', error);
      setMessage({
        type: 'error',
        text: 'Failed to save payload. Please try again.'
      });
      
      // If we get a 401, handle auth error without removing token
      if (isAuthError(error)) {
        handleAuthError(error, 'Authentication error while fetching devices');
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeployPayload = async () => {
    try {
      if (!editorRef.current) {
        setMessage({ type: 'error', text: 'Editor not initialized' });
        return;
      }

      if (!selectedDevice) {
        setMessage({ type: 'error', text: 'Please select a device to deploy to' });
        return;
      }

      const deviceObj = devices.find(d => d.id.toString() === selectedDevice);
      if (!deviceObj) {
        setMessage({ type: 'error', text: 'Selected device not found' });
        return;
      }

      const currentPayloadContent = editorRef.current.getValue();
      
      if (!currentPayloadContent || currentPayloadContent.trim() === '') {
        setMessage({ type: 'error', text: 'Payload content cannot be empty' });
        return;
      }

      setIsLoading(true);
      
      // Save the payload first if it's a new payload or has changes
      let payloadToUse = selectedPayload;
      
      if (
        !payloadToUse || 
        payloadToUse.script !== currentPayloadContent ||
        payloadToUse.name !== payloadName
      ) {
        const savedPayload = await savePayload();
        if (!savedPayload) {
          return; // Error would have been set in savePayload
        }
        payloadToUse = savedPayload;
      }

      // Handle different deployment methods based on device connection type
      if (deviceObj.connectionType === 'usb') {
        // Deploy to USB device using WebSerial API
        try {
          await deployToUsbSerialDevice();
        } catch (error) {
          console.error('Error deploying to USB device:', error);
          setMessage({ 
            type: 'error', 
            text: error instanceof Error 
              ? `USB deployment error: ${error.message}` 
              : 'Failed to deploy to USB device'
          });
        }
      } else {
        // Deploy to network device using API
        const deploymentData = {
          payloadId: payloadToUse.id,
          deviceId: deviceObj.id.toString(),
          connectionType: deviceObj.connectionType || 'network'
        };
        
        const result = await deployPayloadMutation(deploymentData).unwrap();
        
        if (result.success) {
          setMessage({ 
            type: 'success', 
            text: `Deployment initiated! ID: ${result.data.id}` 
          });
        } else {
          setMessage({ 
            type: 'error', 
            text: result.message || 'Failed to deploy payload' 
          });
        }
      }
    } catch (error) {
      console.error('Error in deployPayload:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          handleAuthError('Your session has expired. Please log in again.');
        } else {
          setMessage({ 
            type: 'error', 
            text: error.response?.data?.message || 'Failed to deploy payload' 
          });
        }
      } else {
        setMessage({ 
          type: 'error', 
          text: error instanceof Error ? error.message : 'An unknown error occurred during deployment'
        });
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

  const deployToUsbSerialDevice = async () => {
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

  // Create a new script
  const handleCreateScript = async () => {
    try {
      setIsLoading(true);
      
      // Validate required fields
      if (!scriptFormData.name.trim()) {
        setMessage({ type: 'error', text: 'Script name is required' });
        return;
      }
      
      if (!scriptFormData.content && !fileContent) {
        setMessage({ type: 'error', text: 'Script content is required' });
        return;
      }
      
      // If script type is callback, validate callback URL
      if (scriptFormData.type === 'callback' && !scriptFormData.callbackUrl) {
        setMessage({ type: 'error', text: 'Callback URL is required for callback scripts' });
        return;
      }
      
      // Prepare the script data
      const scriptData = {
        name: scriptFormData.name,
        type: scriptFormData.type as 'callback' | 'exfiltration' | 'command' | 'custom',
        description: scriptFormData.description || null,
        content: fileContent || scriptFormData.content,
        isPublic: scriptFormData.isPublic,
        callbackUrl: scriptFormData.type === 'callback' ? scriptFormData.callbackUrl : null
      };
      
      // Create the script
      const result = await createScriptMutation(scriptData).unwrap();
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Script created successfully!' });
        
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
        
        // Close the modal
        setShowScriptModal(false);
        
        // Refresh scripts
        setIsLoading(true);
        await fetchScripts();
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to create script' });
      }
    } catch (error) {
      console.error('Error creating script:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleAuthError('Your session has expired. Please log in again.');
      } else {
        setMessage({ 
          type: 'error', 
          text: error instanceof Error ? error.message : 'An unknown error occurred while creating the script'
        });
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
      
      const token = getToken();
      if (!token) {
        console.error('No authentication token found');
        window.location.href = '/login';
        return;
      }
      
      // Get current scripts associated with the payload
      const currentScriptIds = selectedPayloadScripts?.success 
        ? selectedPayloadScripts.data.map(script => script.id) 
        : [];
      
      // Scripts to add (selected but not in current)
      const scriptsToAdd = selectedScripts.filter(id => !currentScriptIds.includes(id));
      
      // Scripts to remove (current but not in selected)
      const scriptsToRemove = currentScriptIds.filter(id => !selectedScripts.includes(id));
      
      // Add new associations
      for (const scriptId of scriptsToAdd) {
        await associateScriptMutation({
          scriptId,
          payloadId: selectedPayload.id,
        });
      }
      
      // Remove old associations
      for (const scriptId of scriptsToRemove) {
        await disassociateScriptMutation({
          scriptId,
          payloadId: selectedPayload.id
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
    }
  };
  
  // Update the mutations for scripts
  const [associateScriptMutation] = useAssociateScriptMutation();
  const [disassociateScriptMutation] = useDisassociateScriptMutation();

  // Add a new function to delete a script
  const handleDeleteScript = async (scriptId: string) => {
    try {
      setIsLoading(true);
      const result = await deleteScriptMutation(scriptId).unwrap();

      if (result.success) {
        setMessage({ type: 'success', text: 'Script deleted successfully' });
        
        // If this script was selected, remove it from the selection
        setSelectedScripts(prev => prev.filter(id => id !== scriptId));
        
        // Refetch scripts
        setIsLoading(true);
        await fetchScripts();
        
        // If a payload is selected, also refetch its associated scripts
        if (selectedPayload) {
          await fetchScriptsForPayload(selectedPayload.id);
        }
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to delete script' });
      }
    } catch (error) {
      console.error('Error deleting script:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleAuthError('Your session has expired. Please log in again.');
      } else {
        setMessage({ 
          type: 'error', 
          text: error instanceof Error ? error.message : 'An unknown error occurred while deleting the script'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle the delete confirmation
  const handleScriptDeleteClick = (scriptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Show confirmation dialog
    if (window.confirm('Are you sure you want to delete this script? This action cannot be undone.')) {
      handleDeleteScript(scriptId);
    }
  };
  
  const openScriptEditor = async (script: Script) => {
    try {
      const token = getToken();
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
      
      // If we get a 401, handle auth error without removing token
      if (isAuthError(error)) {
        handleAuthError(error, 'Authentication error while fetching devices');
      }
    }
  };

  const saveScriptChanges = async () => {
    try {
      if (!editingScript) return;
      
      setIsLoading(true);
      
      const token = getToken();
      if (!token) {
        console.error('No authentication token found');
        window.location.href = '/login';
        return;
      }
      
      const scriptData = {
        id: editingScript.id,
        script: {
          name: editingScript.name,
          content: scriptEditorContent,
          type: editingScript.type,
          description: editingScript.description,
          isPublic: editingScript.isPublic,
          callbackUrl: editingScript.callbackUrl
        }
      };
      
      const result = await updateScriptMutation(scriptData).unwrap();
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: `Script "${editingScript.name}" updated successfully!`
        });
        
        // Close the modal
        setShowScriptEditorModal(false);
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Failed to update script'
        });
      }
    } catch (error) {
      console.error('Error updating script:', error);
      setMessage({
        type: 'error',
        text: 'Failed to update script. Please try again.'
      });
      
      // If we get a 401, handle auth error without removing token
      if (isAuthError(error)) {
        handleAuthError(error, 'Authentication error while fetching devices');
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
      
      const token = getToken();
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
              onClick={handleDeployPayload}
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
                                onClick={(e) => handleDeletePayload(payload.id)}
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
                    onClick={handleCreateScript}
                    disabled={isLoading || (!scriptFormData.content && !fileContent)}
                    className="px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-md text-sm text-green-500 hover:bg-green-500/20 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? <FiRefreshCw className="mr-2 animate-spin" size={16} /> : <FiPlusCircle className="mr-2" size={16} />}
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
});

export default PayloadEditor; 