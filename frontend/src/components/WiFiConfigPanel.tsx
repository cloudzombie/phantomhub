import { useState, useEffect } from 'react';
import { 
  FiWifi, 
  FiSearch, 
  FiServer, 
  FiPlus, 
  FiRefreshCw, 
  FiCheck, 
  FiAlertCircle,
  FiWifiOff,
  FiLock,
  FiUnlock
} from 'react-icons/fi';
import {
  OMGDeviceInfo,
  WiFiNetwork,
  WiFiStatus,
  scanWiFiNetworks,
  connectToWiFiNetwork,
  configureAccessPoint,
  getWiFiStatus,
  disconnectFromWiFi
} from '../utils/webSerialUtils';

interface WiFiConfigPanelProps {
  device: OMGDeviceInfo;
  onStatusChange?: (status: WiFiStatus) => void;
}

const WiFiConfigPanel: React.FC<WiFiConfigPanelProps> = ({ device, onStatusChange }) => {
  const [networks, setNetworks] = useState<WiFiNetwork[]>([]);
  const [currentStatus, setCurrentStatus] = useState<WiFiStatus | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<WiFiNetwork | null>(null);
  const [password, setPassword] = useState('');
  const [isApMode, setIsApMode] = useState(false);
  const [apConfig, setApConfig] = useState({
    ssid: 'OMG_CABLE_AP',
    password: '',
    channel: 1,
    hidden: false
  });
  
  // Get current Wi-Fi status when component mounts
  useEffect(() => {
    if (device && device.info.capabilities?.wifi) {
      fetchWiFiStatus();
    }
  }, [device]);
  
  // Fetch the current Wi-Fi status
  const fetchWiFiStatus = async () => {
    try {
      setErrorMessage(null);
      const status = await getWiFiStatus(device);
      setCurrentStatus(status);
      setIsApMode(status.mode === 'ap');
      
      // Notify parent component if callback provided
      if (onStatusChange) {
        onStatusChange(status);
      }
    } catch (error) {
      console.error('Error fetching Wi-Fi status:', error);
      setErrorMessage(`Failed to get Wi-Fi status: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Scan for available networks
  const handleScanNetworks = async () => {
    if (!device.info.capabilities?.wifi) {
      setErrorMessage('This device does not support Wi-Fi capabilities');
      return;
    }
    
    try {
      setIsScanning(true);
      setErrorMessage(null);
      setNetworks([]);
      
      const availableNetworks = await scanWiFiNetworks(device);
      setNetworks(availableNetworks);
    } catch (error) {
      console.error('Error scanning networks:', error);
      setErrorMessage(`Failed to scan networks: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsScanning(false);
    }
  };
  
  // Connect to a Wi-Fi network
  const handleConnectNetwork = async () => {
    if (!selectedNetwork) {
      setErrorMessage('Please select a network first');
      return;
    }
    
    // Check if password is required for secured networks
    if (selectedNetwork.security !== 'open' && !password.trim()) {
      setErrorMessage('Password is required for this network');
      return;
    }
    
    try {
      setIsConnecting(true);
      setErrorMessage(null);
      
      const status = await connectToWiFiNetwork(
        device,
        selectedNetwork.ssid,
        password
      );
      
      setCurrentStatus(status);
      
      // If connection successful, clear selected network and password
      setSelectedNetwork(null);
      setPassword('');
      
      // Notify parent component if callback provided
      if (onStatusChange) {
        onStatusChange(status);
      }
    } catch (error) {
      console.error('Error connecting to network:', error);
      setErrorMessage(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Configure device as access point
  const handleConfigureAp = async () => {
    if (!apConfig.ssid.trim()) {
      setErrorMessage('AP name (SSID) is required');
      return;
    }
    
    if (apConfig.password.trim().length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      return;
    }
    
    try {
      setIsConnecting(true);
      setErrorMessage(null);
      
      const status = await configureAccessPoint(device, {
        ssid: apConfig.ssid,
        password: apConfig.password,
        channel: apConfig.channel,
        hidden: apConfig.hidden
      });
      
      setCurrentStatus(status);
      
      // Notify parent component if callback provided
      if (onStatusChange) {
        onStatusChange(status);
      }
    } catch (error) {
      console.error('Error configuring AP:', error);
      setErrorMessage(`Failed to configure AP: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Disconnect from Wi-Fi
  const handleDisconnect = async () => {
    try {
      setIsConnecting(true);
      setErrorMessage(null);
      
      await disconnectFromWiFi(device);
      
      // Refresh status
      await fetchWiFiStatus();
    } catch (error) {
      console.error('Error disconnecting from Wi-Fi:', error);
      setErrorMessage(`Failed to disconnect: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Helper function to display signal strength
  const renderSignalStrength = (rssi: number) => {
    // RSSI values typically range from -100 dBm (weak) to -30 dBm (strong)
    if (rssi >= -60) {
      return <div className="w-16 h-1.5 bg-green-500 rounded-full"></div>;
    } else if (rssi >= -70) {
      return <div className="w-16 h-1.5 rounded-full bg-green-500/30"><div className="w-12 h-1.5 bg-green-500 rounded-full"></div></div>;
    } else if (rssi >= -80) {
      return <div className="w-16 h-1.5 rounded-full bg-green-500/30"><div className="w-8 h-1.5 bg-green-500 rounded-full"></div></div>;
    } else {
      return <div className="w-16 h-1.5 rounded-full bg-green-500/30"><div className="w-4 h-1.5 bg-green-500 rounded-full"></div></div>;
    }
  };
  
  // Check if the device supports Wi-Fi
  if (!device.info.capabilities?.wifi) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-md shadow-sm p-4">
        <div className="text-center text-slate-400 p-4">
          <FiWifiOff className="mx-auto mb-2" size={24} />
          <p>This device does not support Wi-Fi capabilities.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-md shadow-sm overflow-hidden">
      {/* Header Section */}
      <div className="border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-medium flex items-center">
            <FiWifi className="mr-2 text-blue-500" size={18} />
            Wi-Fi Configuration
          </h2>
          <button 
            onClick={fetchWiFiStatus}
            className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
            title="Refresh Status"
          >
            <FiRefreshCw size={16} className={isConnecting ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      
      {/* Status Section */}
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Current Status</h3>
        
        {currentStatus ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Mode:</span>
              <span className="text-white font-medium">
                {currentStatus.mode === 'station' ? 'Client Mode' : 
                 currentStatus.mode === 'ap' ? 'Access Point Mode' : 'Disconnected'}
              </span>
            </div>
            
            {currentStatus.connected && currentStatus.ssid && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">Network:</span>
                  <span className="text-white font-medium">{currentStatus.ssid}</span>
                </div>
                
                {currentStatus.ip && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">IP Address:</span>
                    <span className="text-white font-mono text-xs">{currentStatus.ip}</span>
                  </div>
                )}
                
                {currentStatus.rssi && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Signal:</span>
                    {renderSignalStrength(currentStatus.rssi)}
                  </div>
                )}
              </>
            )}
            
            <div className="mt-3">
              {currentStatus.connected ? (
                <button
                  onClick={handleDisconnect}
                  disabled={isConnecting}
                  className="w-full px-3 py-2 text-sm bg-red-900/30 border border-red-800/50 rounded text-red-400 hover:bg-red-900/50 flex items-center justify-center"
                >
                  <FiWifiOff className="mr-2" size={16} />
                  Disconnect
                </button>
              ) : (
                <div className="text-center text-slate-400 text-xs">
                  Not connected to any network
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-400 py-2">
            <p className="text-sm">Loading status...</p>
          </div>
        )}
      </div>
      
      {/* Tab Selection */}
      <div className="flex border-b border-slate-700">
        <button 
          className={`flex-1 py-2 text-sm font-medium ${
            !isApMode 
              ? 'text-blue-500 border-b-2 border-blue-500' 
              : 'text-slate-400 hover:text-slate-300'
          }`}
          onClick={() => setIsApMode(false)}
        >
          <div className="flex items-center justify-center">
            <FiSearch size={14} className="mr-1" />
            Connect to Network
          </div>
        </button>
        <button 
          className={`flex-1 py-2 text-sm font-medium ${
            isApMode 
              ? 'text-blue-500 border-b-2 border-blue-500' 
              : 'text-slate-400 hover:text-slate-300'
          }`}
          onClick={() => setIsApMode(true)}
        >
          <div className="flex items-center justify-center">
            <FiServer size={14} className="mr-1" />
            Access Point Mode
          </div>
        </button>
      </div>
      
      {/* Error Message */}
      {errorMessage && (
        <div className="mx-4 mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-sm">
          <div className="flex items-center">
            <FiAlertCircle className="mr-2 flex-shrink-0" size={16} />
            <p>{errorMessage}</p>
          </div>
        </div>
      )}
      
      {/* Content based on selected tab */}
      {!isApMode ? (
        // Connect to Network Tab
        <div className="p-4">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-sm font-medium text-slate-300">Available Networks</h3>
            <button 
              onClick={handleScanNetworks}
              disabled={isScanning}
              className="px-3 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300 hover:bg-slate-600 flex items-center"
            >
              <FiRefreshCw className={`mr-1.5 ${isScanning ? 'animate-spin' : ''}`} size={12} />
              Scan
            </button>
          </div>
          
          {/* Network List */}
          {networks.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {networks.map((network, index) => (
                <div 
                  key={network.bssid || `${network.ssid}-${index}`}
                  onClick={() => setSelectedNetwork(network)}
                  className={`p-3 rounded-md cursor-pointer flex items-center justify-between ${
                    selectedNetwork?.ssid === network.ssid
                      ? 'bg-blue-900/30 border border-blue-800/50'
                      : 'bg-slate-700/50 border border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center">
                    <FiWifi className="mr-2 text-blue-500" size={16} />
                    <div>
                      <div className="text-white text-sm font-medium">{network.ssid}</div>
                      <div className="text-slate-400 text-xs flex items-center mt-0.5">
                        {network.security !== 'open' ? (
                          <FiLock className="mr-1" size={10} />
                        ) : (
                          <FiUnlock className="mr-1" size={10} />
                        )}
                        {network.security !== 'open' ? 'Secured' : 'Open'} • Ch {network.channel}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {renderSignalStrength(network.rssi)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              {isScanning ? (
                <div className="flex flex-col items-center">
                  <FiRefreshCw className="animate-spin mb-2" size={20} />
                  <p>Scanning for networks...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <FiWifi className="mb-2" size={20} />
                  <p>No networks found. Click Scan to search.</p>
                </div>
              )}
            </div>
          )}
          
          {/* Connection Form */}
          {selectedNetwork && (
            <div className="mt-4 border-t border-slate-700 pt-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3">
                Connect to "{selectedNetwork.ssid}"
              </h3>
              
              {selectedNetwork.security !== 'open' && (
                <div className="mb-3">
                  <label className="block text-xs text-slate-400 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Enter network password"
                  />
                </div>
              )}
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedNetwork(null)}
                  className="flex-1 px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded text-slate-300 hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnectNetwork}
                  disabled={isConnecting}
                  className="flex-1 px-3 py-2 text-sm bg-blue-900/30 border border-blue-800/50 rounded text-blue-400 hover:bg-blue-900/50 flex items-center justify-center"
                >
                  {isConnecting && <FiRefreshCw className="mr-2 animate-spin" size={14} />}
                  Connect
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Access Point Mode Tab
        <div className="p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">
              Configure Access Point
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Set up your O.MG Cable to create its own Wi-Fi network for remote access.
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">AP Name (SSID)</label>
                <input
                  type="text"
                  value={apConfig.ssid}
                  onChange={(e) => setApConfig({...apConfig, ssid: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Enter AP name"
                />
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">Password (8+ characters)</label>
                <input
                  type="password"
                  value={apConfig.password}
                  onChange={(e) => setApConfig({...apConfig, password: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Enter AP password"
                />
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">Channel</label>
                <select
                  value={apConfig.channel}
                  onChange={(e) => setApConfig({...apConfig, channel: parseInt(e.target.value, 10)})}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(ch => (
                    <option key={ch} value={ch}>Channel {ch}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hidden-network"
                  checked={apConfig.hidden}
                  onChange={(e) => setApConfig({...apConfig, hidden: e.target.checked})}
                  className="mr-2 rounded"
                />
                <label htmlFor="hidden-network" className="text-xs text-slate-400">
                  Hidden network (not visible in scan results)
                </label>
              </div>
              
              <button
                onClick={handleConfigureAp}
                disabled={isConnecting}
                className="w-full mt-2 px-3 py-2 text-sm bg-blue-900/30 border border-blue-800/50 rounded text-blue-400 hover:bg-blue-900/50 flex items-center justify-center"
              >
                {isConnecting && <FiRefreshCw className="mr-2 animate-spin" size={14} />}
                <FiServer className="mr-2" size={14} />
                Start Access Point
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WiFiConfigPanel; 