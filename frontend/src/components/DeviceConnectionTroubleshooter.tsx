import { useState } from 'react';
import { 
  FiWifi, 
  FiHardDrive, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiSettings,
  FiRefreshCw,
  FiExternalLink,
  FiChevronRight,
  FiInfo
} from 'react-icons/fi';
import { isWebSerialSupported } from '../utils/webSerialUtils';

interface DeviceConnectionTroubleshooterProps {
  connectionType?: 'usb' | 'network';
  ipAddress?: string;
  onClose?: () => void;
  onTryAgain?: () => void;
}

const DeviceConnectionTroubleshooter: React.FC<DeviceConnectionTroubleshooterProps> = ({
  connectionType = 'usb',
  ipAddress,
  onClose,
  onTryAgain
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [checkResults, setCheckResults] = useState<Record<string, boolean>>({});
  const webSerialSupported = isWebSerialSupported();
  
  // Define checks for USB connections
  const usbChecks = [
    {
      id: 'browser',
      title: 'Browser Compatibility',
      description: 'Check if your browser supports WebSerial API (Chrome/Edge required)',
      check: () => webSerialSupported,
      solution: 'Use Google Chrome or Microsoft Edge browser for USB device connectivity.'
    },
    {
      id: 'connected',
      title: 'Physical Connection',
      description: 'Verify that the device is physically connected to your computer',
      check: () => true, // User needs to confirm this manually
      solution: 'Connect the O.MG Cable directly to a USB port on your computer. Avoid using USB hubs if possible.'
    },
    {
      id: 'permissions',
      title: 'USB Permissions',
      description: 'Check if you\'ve granted USB access permissions',
      check: () => true, // User needs to confirm this manually
      solution: 'When prompted, click "Allow" to grant access to the USB device.'
    },
    {
      id: 'driverIssue',
      title: 'Driver Issues',
      description: 'Check for USB driver problems',
      check: () => true, // User needs to confirm this manually
      solution: 'On Windows, check Device Manager for any devices with warning icons. On Mac, check System Information > USB.'
    },
    {
      id: 'cableMode',
      title: 'Device Operation Mode',
      description: 'Verify the O.MG Cable is in the correct mode',
      check: () => true, // User needs to confirm this manually
      solution: 'Ensure the device is not in a firmware update or special operation mode. Try disconnecting and reconnecting the device.'
    }
  ];
  
  // Define checks for network connections
  const networkChecks = [
    {
      id: 'network',
      title: 'Network Connectivity',
      description: 'Check if your computer is connected to the same network as the device',
      check: () => true, // User needs to confirm this manually
      solution: 'Connect to the same WiFi network as your O.MG Cable, or connect directly to the cable\'s access point if applicable.'
    },
    {
      id: 'ipAddress',
      title: 'IP Address Verification',
      description: 'Verify that the IP address is correct',
      check: () => !!ipAddress && /^(\d{1,3}\.){3}\d{1,3}$/.test(ipAddress),
      solution: 'Enter a valid IP address in the format 192.168.1.x. Check the device\'s actual IP address from its configuration.'
    },
    {
      id: 'firewall',
      title: 'Firewall Settings',
      description: 'Check if a firewall is blocking the connection',
      check: () => true, // User needs to confirm this manually
      solution: 'Temporarily disable your firewall or add an exception for the O.MG Cable application.'
    },
    {
      id: 'devicePower',
      title: 'Device Power',
      description: 'Verify the device is powered on and has sufficient battery',
      check: () => true, // User needs to confirm this manually
      solution: 'Ensure the device is powered on and has sufficient battery charge. If using Wi-Fi mode, battery level is critical.'
    },
    {
      id: 'deviceMode',
      title: 'Wi-Fi Mode',
      description: 'Check if the device is in Wi-Fi mode',
      check: () => true, // User needs to confirm this manually
      solution: 'Ensure the device has Wi-Fi enabled and is properly configured for network connectivity.'
    }
  ];
  
  const checks = connectionType === 'usb' ? usbChecks : networkChecks;
  
  const runCheck = (id: string) => {
    const check = checks.find(c => c.id === id);
    if (!check) return;
    
    const result = check.check();
    setCheckResults(prev => ({
      ...prev,
      [id]: result
    }));
  };
  
  const handleNextStep = () => {
    if (currentStep < checks.length) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleTryAgain = () => {
    if (onTryAgain) {
      onTryAgain();
    }
  };
  
  // Render steps content
  const renderStepContent = () => {
    // If we've gone through all steps, show summary
    if (currentStep >= checks.length) {
      return (
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Troubleshooting Summary</h3>
          
          <div className="space-y-3 mb-6">
            {checks.map(check => {
              const result = checkResults[check.id];
              return (
                <div 
                  key={check.id} 
                  className={`p-3 rounded-md ${
                    result === undefined ? 'bg-slate-700/30' :
                    result ? 'bg-green-900/20 border border-green-500/30' : 
                    'bg-red-900/20 border border-red-500/30'
                  }`}
                >
                  <div className="flex items-center">
                    {result === undefined ? (
                      <FiInfo className="mr-2 text-slate-400" size={16} />
                    ) : result ? (
                      <FiCheckCircle className="mr-2 text-green-500" size={16} />
                    ) : (
                      <FiAlertCircle className="mr-2 text-red-500" size={16} />
                    )}
                    <span className={`font-medium ${
                      result === undefined ? 'text-slate-300' :
                      result ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {check.title}
                    </span>
                  </div>
                  {!result && (
                    <div className="mt-2 ml-7 text-xs text-slate-400">
                      <p>Solution: {check.solution}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handlePreviousStep}
              className="flex-1 py-2 rounded-md text-sm font-medium bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600"
            >
              Back
            </button>
            <button
              onClick={handleTryAgain}
              className="flex-1 py-2 rounded-md text-sm font-medium bg-green-500/10 border border-green-500/30 text-green-500 hover:bg-green-500/20 flex items-center justify-center"
            >
              <FiRefreshCw className="mr-2" size={14} />
              Try Again
            </button>
          </div>
          
          <div className="mt-4 p-3 rounded-md bg-blue-900/20 border border-blue-500/30 text-xs text-blue-400">
            <div className="flex">
              <FiInfo className="flex-shrink-0 mr-2 mt-0.5" size={14} />
              <div>
                <p className="mb-1">If you continue to experience issues, please check:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Device firmware is up to date</li>
                  <li>Try a different USB port or cable</li>
                  <li>Restart your device and computer</li>
                  <li>
                    <a 
                      href="https://help.example.com/omg-cable-support" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-400 hover:text-blue-300"
                    >
                      Visit support documentation
                      <FiExternalLink className="ml-1" size={10} />
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Otherwise show current step
    const currentCheck = checks[currentStep];
    return (
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">{currentCheck.title}</h3>
          <span className="text-xs text-slate-400">Step {currentStep + 1} of {checks.length}</span>
        </div>
        
        <p className="text-sm text-slate-400 mb-4">{currentCheck.description}</p>
        
        <div className="p-4 bg-slate-700/30 rounded-md mb-4">
          {connectionType === 'usb' ? (
            <div className="flex items-center justify-center text-slate-300 py-4">
              <FiHardDrive size={24} className="mr-3" />
              <div className="space-y-1">
                <div>Check USB connection</div>
                {currentCheck.id === 'browser' && !webSerialSupported && (
                  <div className="text-xs text-red-400">
                    Your browser does not support WebSerial API.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center text-slate-300 py-4">
              <FiWifi size={24} className="mr-3" />
              <div className="space-y-1">
                <div>Check network connection</div>
                {currentCheck.id === 'ipAddress' && ipAddress && (
                  <div className="text-xs font-mono">
                    IP: {ipAddress}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-slate-700/20 rounded-md border border-slate-700 mb-6">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Troubleshooting Tip</h4>
          <p className="text-xs text-slate-400">{currentCheck.solution}</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => {
              runCheck(currentCheck.id);
              setCheckResults(prev => ({
                ...prev,
                [currentCheck.id]: false
              }));
            }}
            className="flex-1 py-2 rounded-md text-sm font-medium bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20"
          >
            Issue Not Resolved
          </button>
          <button
            onClick={() => {
              runCheck(currentCheck.id);
              setCheckResults(prev => ({
                ...prev,
                [currentCheck.id]: true
              }));
              handleNextStep();
            }}
            className="flex-1 py-2 rounded-md text-sm font-medium bg-green-500/10 border border-green-500/30 text-green-500 hover:bg-green-500/20"
          >
            Issue Resolved
          </button>
        </div>
        
        {currentStep > 0 && (
          <button
            onClick={handlePreviousStep}
            className="mt-3 w-full py-2 rounded-md text-sm font-medium bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600"
          >
            Back
          </button>
        )}
      </div>
    );
  };
  
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-md shadow-lg">
      <div className="border-b border-slate-700 p-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="p-2 rounded-full bg-slate-700">
            {connectionType === 'usb' ? (
              <FiHardDrive className="text-green-500" size={16} />
            ) : (
              <FiWifi className="text-blue-500" size={16} />
            )}
          </div>
          <h2 className="ml-3 text-white font-medium">
            {connectionType === 'usb' ? 'USB' : 'Network'} Connection Troubleshooter
          </h2>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300"
          >
            &times;
          </button>
        )}
      </div>
      
      <div className="p-4">
        {renderStepContent()}
      </div>
    </div>
  );
};

export default DeviceConnectionTroubleshooter; 