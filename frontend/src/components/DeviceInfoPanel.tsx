import { useState, useEffect } from 'react';
import { 
  FiInfo, 
  FiWifi, 
  FiHardDrive, 
  FiCpu, 
  FiRefreshCw, 
  FiDownload, 
  FiCheckCircle, 
  FiAlertCircle,
  FiSettings,
  FiZap,
  FiDatabase,
  FiBattery,
  FiActivity,
  FiShield
} from 'react-icons/fi';
import { 
  getDeviceCapabilities, 
  runDeviceDiagnostics, 
  getLatestFirmwareInfo, 
  isNewerFirmwareVersion,
  updateFirmware,
  type OMGDeviceInfo,
  checkWebSerialConnection
} from '../utils/webSerialUtils';

interface DeviceInfoPanelProps {
  deviceInfo: OMGDeviceInfo | null;
  onRefresh?: () => void;
}

const DeviceInfoPanel: React.FC<DeviceInfoPanelProps> = ({ deviceInfo, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [detailedInfo, setDetailedInfo] = useState<OMGDeviceInfo | null>(null);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);
  const [firmwareInfo, setFirmwareInfo] = useState<{
    version: string;
    url: string;
    releaseNotes: string;
    releaseDate: string;
    minRequiredVersion: string;
  } | null>(null);
  const [firmwareUpdateAvailable, setFirmwareUpdateAvailable] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<{
    progress: number;
    status: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'diagnostics' | 'firmware'>('info');
  
  // Fetch detailed device capabilities when device info changes
  useEffect(() => {
    const fetchDetailedInfo = async () => {
      if (deviceInfo) {
        setLoading(true);
        try {
          // For USB devices, check WebSerial connection
          if (deviceInfo.connectionType === 'usb') {
            const isConnected = await checkWebSerialConnection(deviceInfo.serialPortId);
            deviceInfo.connectionStatus = isConnected ? 'connected' : 'disconnected';
          }
          // For network devices, status is managed by the backend
          else {
            deviceInfo.connectionStatus = deviceInfo.status === 'online' ? 'connected' : 'disconnected';
          }

          const enhancedInfo = await getDeviceCapabilities(deviceInfo);
          setDetailedInfo(enhancedInfo);
          
          // Check for firmware updates
          const latestFirmware = await getLatestFirmwareInfo();
          setFirmwareInfo(latestFirmware);
          
          if (latestFirmware && enhancedInfo.info.firmwareVersion) {
            setFirmwareUpdateAvailable(
              isNewerFirmwareVersion(enhancedInfo.info.firmwareVersion, latestFirmware.version)
            );
          }
        } catch (error) {
          console.error('Error fetching detailed device info:', error);
          deviceInfo.connectionStatus = 'disconnected';
        } finally {
          setLoading(false);
        }
      } else {
        setDetailedInfo(null);
        setFirmwareInfo(null);
        setFirmwareUpdateAvailable(false);
      }
    };
    
    fetchDetailedInfo();
  }, [deviceInfo]);
  
  const handleRunDiagnostics = async () => {
    if (!deviceInfo) return;
    
    setDiagnosticRunning(true);
    setDiagnosticResults(null);
    
    try {
      const results = await runDeviceDiagnostics(deviceInfo);
      setDiagnosticResults(results);
    } catch (error) {
      console.error('Error running diagnostics:', error);
      setDiagnosticResults({
        success: false,
        tests: [],
        summary: `Failed to run diagnostics: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setDiagnosticRunning(false);
    }
  };
  
  const handleUpdateFirmware = async () => {
    if (!deviceInfo || !firmwareInfo) return;
    
    setUpdateProgress({ progress: 0, status: 'Preparing firmware update...' });
    
    try {
      const result = await updateFirmware(
        deviceInfo,
        firmwareInfo.url,
        (progress, status) => {
          setUpdateProgress({ progress, status });
        }
      );
      
      if (result.success) {
        // On successful update, refresh device info
        if (onRefresh) {
          setTimeout(onRefresh, 5000); // Wait for device to fully restart
        }
      } else {
        setUpdateProgress({ progress: 100, status: `Error: ${result.message}` });
      }
    } catch (error) {
      console.error('Error updating firmware:', error);
      setUpdateProgress({ 
        progress: 100, 
        status: `Error: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  };
  
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };
  
  // If no device is connected, show a message
  if (!deviceInfo) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-md shadow-sm p-4">
        <div className="text-center text-slate-400 p-4">
          <FiInfo className="mx-auto mb-2" size={24} />
          <p>No device connected. Connect a device to view detailed information.</p>
        </div>
      </div>
    );
  }
  
  // Format memory usage into human-readable format
  const formatMemory = (bytes?: number): string => {
    if (bytes === undefined) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Helper function to render a capability indicator
  const renderCapability = (name: string, enabled: boolean, icon: React.ReactNode) => (
    <div className="flex items-center mb-2">
      <div className={`mr-2 ${enabled ? 'text-green-500' : 'text-slate-500'}`}>
        {icon}
      </div>
      <span className={enabled ? 'text-slate-200' : 'text-slate-500'}>
        {name}
      </span>
      <span className="ml-auto">
        {enabled ? 
          <span className="text-xs text-green-500">Enabled</span> : 
          <span className="text-xs text-slate-500">Disabled</span>
        }
      </span>
    </div>
  );
  
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-md shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              deviceInfo.connectionStatus === 'connected' ? 'bg-green-500' : 
              deviceInfo.connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <h2 className="text-white font-medium">{detailedInfo?.info.name || 'O.MG Cable'}</h2>
            {detailedInfo?.info.firmwareVersion && (
              <span className="ml-2 text-xs text-slate-400">
                v{detailedInfo.info.firmwareVersion}
              </span>
            )}
          </div>
          <button 
            onClick={handleRefresh}
            className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
            title="Refresh"
          >
            <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        
        {/* Connection status */}
        <div className="mt-2 text-xs text-slate-400">
          {deviceInfo.connectionStatus === 'connected' ? (
            <span className="text-green-500 flex items-center">
              <FiCheckCircle className="mr-1" size={12} /> Connected
            </span>
          ) : deviceInfo.connectionStatus === 'connecting' ? (
            <span className="text-yellow-500 flex items-center">
              <FiActivity className="mr-1" size={12} /> Connecting...
            </span>
          ) : (
            <span className="text-red-500 flex items-center">
              <FiAlertCircle className="mr-1" size={12} /> Disconnected
            </span>
          )}
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-700">
        <button 
          className={`flex-1 py-2 text-sm font-medium ${
            activeTab === 'info' 
              ? 'text-green-500 border-b-2 border-green-500' 
              : 'text-slate-400 hover:text-slate-300'
          }`}
          onClick={() => setActiveTab('info')}
        >
          <div className="flex items-center justify-center">
            <FiInfo size={14} className="mr-1" />
            Info
          </div>
        </button>
        <button 
          className={`flex-1 py-2 text-sm font-medium ${
            activeTab === 'diagnostics' 
              ? 'text-green-500 border-b-2 border-green-500' 
              : 'text-slate-400 hover:text-slate-300'
          }`}
          onClick={() => setActiveTab('diagnostics')}
        >
          <div className="flex items-center justify-center">
            <FiActivity size={14} className="mr-1" />
            Diagnostics
          </div>
        </button>
        <button 
          className={`flex-1 py-2 text-sm font-medium ${
            activeTab === 'firmware' 
              ? 'text-green-500 border-b-2 border-green-500' 
              : 'text-slate-400 hover:text-slate-300'
          }`}
          onClick={() => setActiveTab('firmware')}
        >
          <div className="flex items-center justify-center">
            <FiDownload size={14} className="mr-1" />
            Firmware
          </div>
        </button>
      </div>
      
      {/* Content area */}
      <div className="p-4">
        {/* Info Tab */}
        {activeTab === 'info' && (
          <div>
            {loading ? (
              <div className="flex justify-center items-center py-4">
                <FiRefreshCw size={20} className="animate-spin text-green-500" />
              </div>
            ) : (
              <>
                {/* Basic device info */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-slate-300 border-b border-slate-700 pb-2 mb-2">
                    Device Information
                  </h3>
                  <div className="text-xs text-slate-400 space-y-2">
                    <div className="flex justify-between">
                      <span>Device ID:</span>
                      <span className="text-slate-300 font-mono">
                        {detailedInfo?.info.deviceId || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Firmware Version:</span>
                      <span className="text-slate-300">
                        {detailedInfo?.info.firmwareVersion || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Connection Type:</span>
                      <span className="text-slate-300">USB Serial</span>
                    </div>
                  </div>
                </div>
                
                {/* Capabilities */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-slate-300 border-b border-slate-700 pb-2 mb-2">
                    Capabilities
                  </h3>
                  <div className="text-xs space-y-1">
                    {renderCapability(
                      'USB HID (Keystroke Injection)', 
                      !!detailedInfo?.info.capabilities?.usbHid,
                      <FiHardDrive size={14} />
                    )}
                    {renderCapability(
                      'Wi-Fi Connectivity', 
                      !!detailedInfo?.info.capabilities?.wifi,
                      <FiWifi size={14} />
                    )}
                    {renderCapability(
                      'Bluetooth', 
                      !!detailedInfo?.info.capabilities?.bluetooth,
                      <FiZap size={14} />
                    )}
                    {detailedInfo?.info.capabilities?.storage && (
                      <div className="flex items-center mb-2">
                        <div className="mr-2 text-green-500">
                          <FiDatabase size={14} />
                        </div>
                        <span className="text-slate-200">Storage</span>
                        <span className="ml-auto text-xs text-green-500">
                          {detailedInfo?.info.capabilities?.storage}
                        </span>
                      </div>
                    )}
                    {detailedInfo?.info.capabilities?.batteryLevel !== undefined && (
                      <div className="flex items-center mb-2">
                        <div className="mr-2 text-green-500">
                          <FiBattery size={14} />
                        </div>
                        <span className="text-slate-200">Battery</span>
                        <span className="ml-auto text-xs text-green-500">
                          {detailedInfo?.info.capabilities?.batteryLevel}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Memory usage if available */}
                {detailedInfo?.info.capabilities?.memoryUsage && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-slate-300 border-b border-slate-700 pb-2 mb-2">
                      Memory Usage
                    </h3>
                    <div className="text-xs text-slate-400 space-y-2">
                      <div className="mb-1">
                        <div className="flex justify-between mb-1">
                          <span>Used:</span>
                          <span className="text-slate-300">
                            {formatMemory(detailedInfo.info.capabilities.memoryUsage.used)} / 
                            {formatMemory(detailedInfo.info.capabilities.memoryUsage.total)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5">
                          <div 
                            className="bg-green-500 h-1.5 rounded-full" 
                            style={{ 
                              width: `${Math.min(100, (detailedInfo.info.capabilities.memoryUsage.used / 
                                detailedInfo.info.capabilities.memoryUsage.total) * 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span>Free:</span>
                        <span className="text-slate-300">
                          {formatMemory(detailedInfo.info.capabilities.memoryUsage.free)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Supported features if available */}
                {detailedInfo?.info.capabilities?.supportedFeatures && 
                  detailedInfo.info.capabilities.supportedFeatures.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-300 border-b border-slate-700 pb-2 mb-2">
                        Supported Features
                      </h3>
                      <div className="text-xs text-slate-400 grid grid-cols-2 gap-1">
                        {detailedInfo.info.capabilities.supportedFeatures.map((feature, index) => (
                          <div key={index} className="flex items-center">
                            <FiCheckCircle className="mr-1 text-green-500" size={10} />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </>
            )}
          </div>
        )}
        
        {/* Diagnostics Tab */}
        {activeTab === 'diagnostics' && (
          <div>
            {!diagnosticResults && !diagnosticRunning ? (
              <div>
                <p className="text-sm text-slate-400 mb-4">
                  Run a diagnostic test on your device to check all functionality and identify potential issues.
                </p>
                <button
                  onClick={handleRunDiagnostics}
                  disabled={deviceInfo.connectionStatus !== 'connected'}
                  className={`w-full py-2 rounded-md text-sm font-medium flex items-center justify-center ${
                    deviceInfo.connectionStatus === 'connected'
                      ? 'bg-green-500/10 border border-green-500/30 text-green-500 hover:bg-green-500/20'
                      : 'bg-slate-700/30 border border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <FiActivity className="mr-2" size={14} />
                  Run Diagnostic Test
                </button>
              </div>
            ) : diagnosticRunning ? (
              <div className="py-8 text-center">
                <FiRefreshCw size={24} className="animate-spin text-green-500 mx-auto mb-4" />
                <p className="text-slate-300">Running diagnostics...</p>
                <p className="text-xs text-slate-400 mt-2">This may take a minute. Please wait.</p>
              </div>
            ) : diagnosticResults && (
              <div>
                <div className={`mb-4 p-3 rounded-md ${
                  diagnosticResults.success
                    ? 'bg-green-900/20 border border-green-500/30 text-green-400'
                    : 'bg-red-900/20 border border-red-500/30 text-red-400'
                }`}>
                  <div className="flex items-start">
                    {diagnosticResults.success ? (
                      <FiCheckCircle className="mt-0.5 mr-2 flex-shrink-0" size={16} />
                    ) : (
                      <FiAlertCircle className="mt-0.5 mr-2 flex-shrink-0" size={16} />
                    )}
                    <p className="text-sm">{diagnosticResults.summary}</p>
                  </div>
                </div>
                
                <h3 className="text-sm font-medium text-slate-300 border-b border-slate-700 pb-2 mb-2">
                  Test Results
                </h3>
                
                <div className="space-y-2 mb-4">
                  {diagnosticResults.tests.map((test: any, index: number) => (
                    <div 
                      key={index} 
                      className={`p-2 rounded-md text-xs ${
                        test.passed
                          ? 'bg-green-900/10 border border-green-500/20'
                          : 'bg-red-900/10 border border-red-500/20'
                      }`}
                    >
                      <div className="flex items-center mb-1">
                        {test.passed ? (
                          <FiCheckCircle className="mr-2 text-green-500" size={12} />
                        ) : (
                          <FiAlertCircle className="mr-2 text-red-500" size={12} />
                        )}
                        <span className={test.passed ? 'text-green-400' : 'text-red-400'}>
                          {test.name}
                        </span>
                      </div>
                      <p className="text-slate-400 ml-5">{test.message}</p>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={handleRunDiagnostics}
                  className="w-full py-2 rounded-md text-sm font-medium bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 flex items-center justify-center"
                >
                  <FiRefreshCw className="mr-2" size={14} />
                  Run Again
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Firmware Tab */}
        {activeTab === 'firmware' && (
          <div>
            {updateProgress ? (
              <div>
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{updateProgress.status}</span>
                    <span>{updateProgress.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${updateProgress.progress}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Only show this button when update is complete or has errored */}
                {updateProgress.progress === 100 && (
                  <button
                    onClick={() => setUpdateProgress(null)}
                    className="w-full py-2 rounded-md text-sm font-medium bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 flex items-center justify-center"
                  >
                    <FiRefreshCw className="mr-2" size={14} />
                    Back to Firmware Info
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-slate-300 border-b border-slate-700 pb-2 mb-2">
                    Current Firmware
                  </h3>
                  <div className="text-xs text-slate-400 space-y-2">
                    <div className="flex justify-between">
                      <span>Version:</span>
                      <span className="text-slate-300 font-mono">
                        {detailedInfo?.info.firmwareVersion || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-slate-300 border-b border-slate-700 pb-2 mb-2">
                    Latest Firmware
                  </h3>
                  {firmwareInfo ? (
                    <div className="text-xs text-slate-400 space-y-2">
                      <div className="flex justify-between">
                        <span>Version:</span>
                        <span className={`font-mono ${firmwareUpdateAvailable ? 'text-green-500' : 'text-slate-300'}`}>
                          {firmwareInfo.version}
                          {firmwareUpdateAvailable && ' (Update Available)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Released:</span>
                        <span className="text-slate-300">
                          {firmwareInfo.releaseDate}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span>Release Notes:</span>
                        <p className="mt-1 p-2 bg-slate-700/50 rounded border border-slate-600 text-slate-300">
                          {firmwareInfo.releaseNotes}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-slate-400 py-3">
                      <p>Could not retrieve latest firmware information</p>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={handleUpdateFirmware}
                  disabled={!firmwareUpdateAvailable || deviceInfo.connectionStatus !== 'connected'}
                  className={`w-full py-2 rounded-md text-sm font-medium flex items-center justify-center ${
                    firmwareUpdateAvailable && deviceInfo.connectionStatus === 'connected'
                      ? 'bg-green-500/10 border border-green-500/30 text-green-500 hover:bg-green-500/20'
                      : 'bg-slate-700/30 border border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <FiDownload className="mr-2" size={14} />
                  {firmwareUpdateAvailable ? 'Update Firmware' : 'No Update Available'}
                </button>
                
                <div className="mt-4 p-3 rounded-md bg-slate-700/30 text-xs text-slate-400 flex">
                  <FiShield className="flex-shrink-0 mr-2 mt-0.5 text-slate-500" size={12} />
                  <p>
                    Firmware updates improve functionality and security of your device. 
                    Always ensure your device has sufficient battery before updating.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceInfoPanel; 