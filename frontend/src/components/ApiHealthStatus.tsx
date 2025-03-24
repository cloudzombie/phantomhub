import { useState, useEffect } from 'react';
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
  FiHash
} from 'react-icons/fi';
import ApiService from '../services/ApiService';

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
  activeConnections: number;
  responseTime: number;
  cpuLoad: number;
  processes?: {
    pid: number;
    memoryUsage: number;
  };
  lastChecked: Date;
}

const ApiHealthStatus = () => {
  const [apiHealth, setApiHealth] = useState<ApiHealth>({
    status: 'offline',
    version: 'v1.0.0',
    uptime: 0,
    memory: {
      used: 0,
      total: 0
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

  const checkApiHealth = async () => {
    setChecking(true);
    setErrorMessage(null);
    
    try {
      // Get start time for response time calculation
      const startTime = Date.now();
      
      // Get the API config for the base URL
      const apiConfig = ApiService.getConfig();
      const baseUrl = apiConfig.endpoint.replace('/api', '');
      
      console.log('Checking API health at:', `${baseUrl}/health`);
      
      // Make the API request directly with axios instead of ApiService
      // since the health endpoint is outside the API path
      const axios = ApiService.getAxiosInstance();
      const response = await axios.get(`${baseUrl}/health`, {
        baseURL: '' // Override the base URL
      });
      
      // Calculate response time
      const responseTime = Date.now() - startTime;
      
      // Check if we got a valid response
      if (response.data && response.data.success) {
        // Update the health data with the response from the API
        const healthData = response.data.data;
        
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
      console.error('API health check failed:', error);
      
      // Provide detailed error feedback
      if (error instanceof Error) {
        setErrorMessage(`Error: ${error.message}`);
      } else {
        setErrorMessage('Unknown error checking API health');
      }
      
      // Update status to offline if we can't reach the API
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
    // Check API health on mount
    checkApiHealth();
    
    // Get polling interval from API service config
    const { pollingInterval } = ApiService.getConfig();
    const intervalMs = pollingInterval * 1000;
    
    // Set up interval to check API health based on configured polling interval
    const interval = setInterval(checkApiHealth, intervalMs);
    
    // Event listener for API config changes to update polling interval
    const handleApiConfigChange = (event: CustomEvent) => {
      if (event.detail && event.detail.pollingInterval) {
        // Clear existing interval and create a new one with updated polling interval
        clearInterval(interval);
        const newIntervalMs = event.detail.pollingInterval * 1000;
        setInterval(checkApiHealth, newIntervalMs);
      }
    };
    
    document.addEventListener('api-config-changed', handleApiConfigChange as EventListener);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('api-config-changed', handleApiConfigChange as EventListener);
    };
  }, []);

  // Format uptime as days, hours, minutes, seconds
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'degraded': return 'bg-orange-500';
      default: return 'bg-red-500';
    }
  };

  const getStatusColorText = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'degraded': return 'text-orange-500';
      default: return 'text-red-500';
    }
  };

  const getMemoryPercentageColor = (percentage?: number) => {
    if (!percentage) return 'bg-gray-500';
    if (percentage > 90) return 'bg-red-500';
    if (percentage > 70) return 'bg-orange-500';
    return 'bg-green-500';
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
            
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="text-[9px] text-slate-400 flex items-center">
                  <FiDatabase className="mr-1" size={10} />
                  Memory
                </div>
                <div className="text-[9px] font-mono">{apiHealth.memory.used}MB / {apiHealth.memory.total}MB</div>
              </div>
              {apiHealth.memory.percentage !== undefined && (
                <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getMemoryPercentageColor(apiHealth.memory.percentage)}`} 
                    style={{ width: `${apiHealth.memory.percentage}%` }}
                  ></div>
                </div>
              )}
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