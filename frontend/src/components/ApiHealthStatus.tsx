import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FiServer, 
  FiCpu, 
  FiDatabase, 
  FiActivity, 
  FiUsers, 
  FiClock, 
  FiChevronDown, 
  FiChevronUp,
  FiHardDrive,
  FiInfo,
  FiCommand,
  FiHash,
  FiCheckCircle,
  FiAlertCircle,
  FiXCircle,
  FiCircle,
  FiRefreshCw,
  FiWifi
} from 'react-icons/fi';
import ApiService from '../services/ApiService';
import { getSocket } from '../utils/socketUtils';
import NotificationService from '../services/NotificationService';

interface ApiHealthStatusProps {
  onStatusChange?: (status: 'healthy' | 'degraded' | 'down') => void;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  details?: Record<string, unknown>;
}

interface ApiHealth {
  status: 'online' | 'offline' | 'degraded';
  version: string;
  uptime: number;
  hostname?: string;
  platform?: string;
  cpuInfo?: string;
  loadAvg?: string[];
  memory: {
    used: number;
    total: number;
    percentage?: number;
  };
  database?: {
    status: 'online' | 'offline' | 'error';
    responseTime: number;
    dialect: string;
    host: string;
  };
  redis?: {
    status: 'online' | 'offline' | 'error';
    host?: string;
    port?: number;
  };
  activeConnections: number;
  responseTime: number;
  cpuLoad: number;
  processes?: {
    pid: number;
    memoryUsage: number;
  };
  lastChecked: Date;
}

const ApiHealthStatus: React.FC<ApiHealthStatusProps> = ({ onStatusChange }) => {
  const [apiHealth, setApiHealth] = useState<ApiHealth>({
    status: 'offline',
    version: 'v1.0.0',
    uptime: 0,
    memory: {
      used: 0,
      total: 0
    },
    database: {
      status: 'offline',
      responseTime: 0,
      dialect: '',
      host: ''
    },
    redis: {
      status: 'offline',
      host: '',
      port: 0
    },
    activeConnections: 0,
    responseTime: 0,
    cpuLoad: 0,
    lastChecked: new Date()
  });
  const [expanded, setExpanded] = useState(false);
  const [checking, setChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [socketStatus, setSocketStatus] = useState<'untested' | 'testing' | 'connected' | 'failed'>('untested');
  const [socketTestResult, setSocketTestResult] = useState<string | null>(null);

  const checkApiHealth = async () => {
    setChecking(true);
    setErrorMessage(null);
    
    try {
      // Get start time for response time calculation
      const startTime = Date.now();
      
      // Determine if we're in production
      const isProd = import.meta.env.PROD;
      
      // Use the Heroku URL directly in production
      const apiUrl = isProd 
        ? 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api'
        : 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api';
      
      // Use system routes health endpoint
      const healthEndpoint = `${apiUrl}/system/health`;
      console.log('Checking API health at:', healthEndpoint);
      
      // Make a direct axios request without using the service
      const response = await axios.get(healthEndpoint);
      
      // Calculate response time
      const responseTime = Date.now() - startTime;
      
      // Check if we got a valid response
      if (response.data && response.data.success) {
        // Update the health data with the response from the API
        const healthData = response.data.data;
        
        console.log('Health data:', healthData);
        
        setApiHealth({
          ...healthData,
          responseTime,
          lastChecked: new Date()
        });
      } else {
        // Handle unsuccessful API response
        setErrorMessage('API returned an error response');
        setApiHealth(prev => ({
          ...prev,
          status: 'degraded',
          lastChecked: new Date(),
          responseTime
        }));
      }
    } catch (error) {
      console.error('Error checking API health:', error);
      setErrorMessage('Failed to connect to API');
      setApiHealth(prev => ({
        ...prev,
        status: 'offline',
        lastChecked: new Date()
      }));
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkApiHealth();
    
    const { pollingInterval } = ApiService.getConfig();
    const interval = pollingInterval * 1000;
    const timer = setInterval(checkApiHealth, interval);
    
    const handleConfigChange = (event: CustomEvent<any>) => {
      if (event.detail && event.detail.pollingInterval) {
        clearInterval(timer);
        const newInterval = event.detail.pollingInterval * 1000;
        setInterval(checkApiHealth, newInterval);
      }
    };
    
    document.addEventListener('api-config-changed', handleConfigChange as EventListener);
    
    // Set up socket event listeners for real-time updates
    const socket = getSocket();
    if (socket) {
      console.log('ApiHealthStatus: Setting up socket event listeners');
      
      // Listen for server status updates
      socket.on('server_status', (data) => {
        console.log('ApiHealthStatus: Received real-time server status update', data);
        if (data && typeof data === 'object') {
          setApiHealth(prev => ({
            ...prev,
            ...data,
            lastChecked: new Date()
          }));
        }
      });
      
      // Listen for server load updates
      socket.on('server_load', (data) => {
        console.log('ApiHealthStatus: Received real-time server load update', data);
        if (data && typeof data === 'object') {
          setApiHealth(prev => ({
            ...prev,
            cpuLoad: data.cpuLoad || prev.cpuLoad,
            memory: {
              ...prev.memory,
              used: data.memoryUsed || prev.memory.used,
              percentage: data.memoryPercentage || prev.memory.percentage
            },
            lastChecked: new Date()
          }));
        }
      });
    }
    
    return () => {
      clearInterval(timer);
      document.removeEventListener('api-config-changed', handleConfigChange as EventListener);
      
      // Clean up socket event listeners
      const socket = getSocket();
      if (socket) {
        socket.off('server_status');
        socket.off('server_load');
      }
    };
  }, []);

  // Format uptime in a human-readable format
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };
  
  // Format memory usage
  const formatMemory = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    } else {
      return `${mb} MB`;
    }
  };
  
  // Format memory usage as a human-readable string
  const getMemoryUsage = () => {
    const used = formatMemory(apiHealth.memory.used);
    const total = formatMemory(apiHealth.memory.total);
    return `${used} / ${total}`;
  };
  
  // Get the appropriate color for the status indicator
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getMemoryPercentageColor = (percentage?: number) => {
    if (!percentage) return 'bg-gray-500';
    if (percentage > 90) return 'bg-red-500';
    if (percentage > 70) return 'bg-orange-500';
    return 'bg-green-500';
  };

  // Handle socket test
  const handleSocketTest = async () => {
    console.log('ApiHealthStatus: Starting socket test...');
    setSocketStatus('testing');
    setSocketTestResult(null);
    
    try {
      // Subscribe to system updates to get test results
      const handleSocketTestResult = (data: any) => {
        console.log('ApiHealthStatus: Received socket test result:', data);
        if (data && data.type === 'socket_test') {
          setSocketStatus(data.success ? 'connected' : 'failed');
          setSocketTestResult(JSON.stringify(data.data || data.message, null, 2));
          // Unsubscribe after receiving the result
          NotificationService.unsubscribe('system_update', handleSocketTestResult);
        }
      };
      
      // Subscribe for the test result
      NotificationService.subscribe('system_update', handleSocketTestResult);
      
      // Perform the test
      await NotificationService.testSocketConnection();
      
      // Set a timeout for the test response (additional safeguard)
      const timeoutId = setTimeout(() => {
        if (socketStatus === 'testing') {
          console.log('ApiHealthStatus: Socket test timed out');
          setSocketStatus('failed');
          setSocketTestResult('Socket test timed out after 6 seconds (no response from server)');
          NotificationService.unsubscribe('system_update', handleSocketTestResult);
        }
      }, 6000);
      
      // Clean up timeout on component unmount
      return () => clearTimeout(timeoutId);
      
    } catch (error) {
      console.error('ApiHealthStatus: Error testing socket:', error);
      setSocketStatus('failed');
      setSocketTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="relative">
      {/* Clickable Status Indicator */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="p-2 rounded bg-slate-700/50 border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-colors"
      >
        <div className="text-[9px] text-slate-400 flex items-center justify-center">
          <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(apiHealth.status)} animate-pulse mr-1`}></div>
          <span>System {apiHealth.status === 'online' ? 'Online' : apiHealth.status === 'degraded' ? 'Degraded' : 'Offline'}</span>
          {expanded ? <FiChevronUp size={10} className="ml-1" /> : <FiChevronDown size={10} className="ml-1" />}
        </div>
        <div className="text-[9px] text-center text-slate-500 mt-1 font-mono">{apiHealth.version}</div>
      </div>

      {/* Expanded View */}
      {expanded && (
        <div className="fixed z-40 left-[140px] top-[80px] w-72 glass rounded-md p-3 shadow-xl border border-slate-600/50 animate-fadeIn" 
             style={{maxHeight: '80vh', overflowY: 'auto'}}>
          <div className="text-xs font-medium mb-2 text-white flex items-center justify-between sticky top-0 bg-slate-800 py-1 z-10">
            <span className="flex items-center">
              <FiServer className="mr-1" size={14} />
              API Health Status
            </span>
            <div className="flex items-center">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAdvanced(!showAdvanced);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-700/50 mr-1"
                title={showAdvanced ? "Show Basic Info" : "Show Advanced Info"}
              >
                <FiInfo size={12} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  checkApiHealth();
                }}
                className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-700/50"
                disabled={checking}
                title="Refresh"
              >
                <FiActivity size={12} className={checking ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
          
          {errorMessage && (
            <div className="mb-2 p-1.5 bg-red-500/10 border border-red-500/20 rounded text-[9px] text-red-400">
              {errorMessage}
            </div>
          )}
          
          <div className="space-y-2 mb-2">
            <div className="flex justify-between items-center">
              <div className="text-[9px] text-slate-400 flex items-center">
                <FiClock className="mr-1" size={10} />
                Uptime
              </div>
              <div className="text-[9px] font-mono">{formatUptime(apiHealth.uptime)}</div>
            </div>
            
            {/* Database Status */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <div className="text-[9px] text-slate-400 flex items-center">
                  <FiDatabase className="mr-1" size={10} />
                  Database
                </div>
                <div className="text-[9px] font-mono flex items-center">
                  <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(apiHealth.database?.status || 'offline')} mr-1`}></div>
                  {apiHealth.database?.status === 'online' ? 'Connected' : apiHealth.database?.status === 'error' ? 'Error' : 'Disconnected'}
                </div>
              </div>
              {apiHealth.database?.status === 'online' && (
                <div className="text-[8px] text-slate-500 flex justify-between items-center">
                  <span>Response: {apiHealth.database.responseTime}ms</span>
                  <span>{apiHealth.database.dialect}@{apiHealth.database.host}</span>
                </div>
              )}
            </div>
            
            {/* Redis Status */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <div className="text-[9px] text-slate-400 flex items-center">
                  <FiDatabase className="mr-1" size={10} />
                  Redis
                </div>
                <div className="text-[9px] font-mono flex items-center">
                  <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(apiHealth.redis?.status || 'offline')} mr-1`}></div>
                  {apiHealth.redis?.status === 'online' ? 'Connected' : apiHealth.redis?.status === 'error' ? 'Error' : 'Disconnected'}
                </div>
              </div>
              {apiHealth.redis?.status === 'online' && apiHealth.redis.host && (
                <div className="text-[8px] text-slate-500 flex justify-between items-center">
                  <span>Cache System</span>
                  <span>{apiHealth.redis.host}{apiHealth.redis.port ? `:${apiHealth.redis.port}` : ''}</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <div className="text-[9px] text-slate-400 flex items-center">
                  <FiHardDrive className="mr-1" size={10} />
                  Memory
                </div>
                <div className="text-[9px] font-mono">{getMemoryUsage()}</div>
              </div>
              <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${apiHealth.memory.percentage && apiHealth.memory.percentage > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${apiHealth.memory.percentage || Math.round((apiHealth.memory.used / apiHealth.memory.total) * 100) || 0}%` }}
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <div className="text-[9px] text-slate-400 flex items-center">
                  <FiCpu className="mr-1" size={10} />
                  CPU Load
                </div>
                <div className="text-[9px] font-mono">{apiHealth.cpuLoad}%</div>
              </div>
              {/* Add CPU Load bar */}
              <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${apiHealth.cpuLoad > 90 ? 'bg-red-500' : apiHealth.cpuLoad > 70 ? 'bg-orange-500' : 'bg-green-500'}`} 
                  style={{ width: `${apiHealth.cpuLoad}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-[9px] text-slate-400 flex items-center">
                <FiUsers className="mr-1" size={10} />
                Active Connections
              </div>
              <div className="text-[9px] font-mono">{apiHealth.activeConnections}</div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-[9px] text-slate-400 flex items-center">
                <FiActivity className="mr-1" size={10} />
                Response Time
              </div>
              <div className="text-[9px] font-mono">{apiHealth.responseTime}ms</div>
            </div>

            {/* Always show basic advanced info without toggle */}
            <div className="mt-2 pt-2 border-t border-slate-700/50">
              <div className="text-[9px] text-slate-400 font-medium mb-2">System Information</div>
              
              {apiHealth.hostname && (
                <div className="flex justify-between items-center mb-1">
                  <div className="text-[9px] text-slate-400 flex items-center">
                    <FiServer className="mr-1" size={10} />
                    Hostname
                  </div>
                  <div className="text-[9px] font-mono">{apiHealth.hostname}</div>
                </div>
              )}
              
              {apiHealth.platform && (
                <div className="flex justify-between items-center mb-1">
                  <div className="text-[9px] text-slate-400 flex items-center">
                    <FiCommand className="mr-1" size={10} />
                    Platform
                  </div>
                  <div className="text-[9px] font-mono">{apiHealth.platform}</div>
                </div>
              )}
            </div>

            {/* Additional advanced information with toggle */}
            {showAdvanced && (
              <div className="pt-2 border-t border-slate-700/50">
                <div className="text-[9px] text-slate-400 font-medium mb-2">Advanced Details</div>
                
                {apiHealth.cpuInfo && (
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[9px] text-slate-400 flex items-center">
                      <FiCpu className="mr-1" size={10} />
                      CPU
                    </div>
                    <div className="text-[9px] font-mono text-right" style={{maxWidth: '150px'}} title={apiHealth.cpuInfo}>
                      {apiHealth.cpuInfo.length > 20 ? apiHealth.cpuInfo.substring(0, 20) + '...' : apiHealth.cpuInfo}
                    </div>
                  </div>
                )}
                
                {apiHealth.loadAvg && (
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[9px] text-slate-400 flex items-center">
                      <FiActivity className="mr-1" size={10} />
                      Load Avg (1m, 5m, 15m)
                    </div>
                    <div className="text-[9px] font-mono">{apiHealth.loadAvg.join(', ')}</div>
                  </div>
                )}
                
                {apiHealth.processes && (
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[9px] text-slate-400 flex items-center">
                      <FiHash className="mr-1" size={10} />
                      Process Memory
                    </div>
                    <div className="text-[9px] font-mono">{apiHealth.processes.memoryUsage}MB (PID: {apiHealth.processes.pid})</div>
                  </div>
                )}

                {/* Add WebSocket Test Button */}
                <div className="flex flex-col space-y-1 mt-2">
                  <div className="flex justify-between items-center">
                    <div className="text-[9px] text-slate-400 flex items-center">
                      <FiWifi className="mr-1" size={10} />
                      WebSocket Status
                    </div>
                    <div className="text-[9px] font-mono flex items-center">
                      {socketStatus === 'untested' && (
                        <span className="text-slate-400">Not Tested</span>
                      )}
                      {socketStatus === 'testing' && (
                        <span className="text-blue-400 flex items-center">
                          <FiRefreshCw className="animate-spin mr-1" size={8} />
                          Testing...
                        </span>
                      )}
                      {socketStatus === 'connected' && (
                        <span className="text-green-400 flex items-center">
                          <FiCheckCircle className="mr-1" size={8} />
                          Connected
                        </span>
                      )}
                      {socketStatus === 'failed' && (
                        <span className="text-red-400 flex items-center">
                          <FiXCircle className="mr-1" size={8} />
                          Failed
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSocketTest();
                      }}
                      className="text-[9px] bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded w-full"
                      disabled={socketStatus === 'testing'}
                    >
                      {socketStatus === 'testing' ? 'Testing...' : 'Test WebSocket Connection'}
                    </button>
                  </div>
                  
                  {socketTestResult && (
                    <div className="mt-1 p-1 bg-slate-800 rounded text-[8px] text-slate-300 font-mono">
                      <pre className="whitespace-pre-wrap overflow-auto max-h-[100px]">
                        {socketTestResult}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="text-[8px] text-slate-500 text-center sticky bottom-0 bg-slate-800 py-1">
            Last checked: {apiHealth.lastChecked.toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiHealthStatus; 