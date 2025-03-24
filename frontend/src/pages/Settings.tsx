import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FiSave, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiToggleLeft, 
  FiToggleRight, 
  FiSettings, 
  FiMoon,
  FiSun,
  FiServer,
  FiBell,
  FiGlobe,
  FiUser,
  FiClock,
  FiShield
} from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface SettingsState {
  theme: 'dark' | 'light' | 'system';
  notifications: {
    deviceStatus: boolean;
    deploymentAlerts: boolean;
    systemUpdates: boolean;
    securityAlerts: boolean;
  };
  api: {
    endpoint: string;
    pollingInterval: number;
    timeout: number;
  };
  display: {
    compactView: boolean;
    showAdvancedOptions: boolean;
    dateFormat: string;
  };
  security: {
    autoLogout: number;
    requireConfirmation: boolean;
  };
}

const Settings = () => {
  const [settings, setSettings] = useState<SettingsState>({
    theme: 'dark',
    notifications: {
      deviceStatus: true,
      deploymentAlerts: true,
      systemUpdates: false,
      securityAlerts: true,
    },
    api: {
      endpoint: API_URL,
      pollingInterval: 60,
      timeout: 30,
    },
    display: {
      compactView: false,
      showAdvancedOptions: true,
      dateFormat: 'MM/DD/YYYY',
    },
    security: {
      autoLogout: 30,
      requireConfirmation: true,
    }
  });
  
  const [savedSettings, setSavedSettings] = useState<SettingsState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    // Load settings from localStorage
    const storedSettings = localStorage.getItem('phantomhub_settings');
    if (storedSettings) {
      try {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings(parsedSettings);
        setSavedSettings(parsedSettings);
        
        // Apply stored settings on initial load
        applyTheme(parsedSettings.theme);
        applyCompactMode(parsedSettings.display.compactView);
        applyDateFormat(parsedSettings.display.dateFormat);
        setupAutoLogout(parsedSettings.security.autoLogout);
      } catch (error) {
        console.error('Error parsing stored settings:', error);
      }
    } else {
      // If no stored settings, apply defaults
      applyTheme(settings.theme);
      applyCompactMode(settings.display.compactView);
      applyDateFormat(settings.display.dateFormat);
      setupAutoLogout(settings.security.autoLogout);
    }
    
    // Setup API configuration
    updateApiConfig(settings.api);
    
    // Setup notification handlers
    setupNotificationHandlers(settings.notifications);
    
    return () => {
      // Clean up any listeners when component unmounts
      window.clearTimeout(autoLogoutTimerId);
    };
  }, []);
  
  // Keep track of auto logout timer
  let autoLogoutTimerId: number;
  let lastActivity = Date.now();
  
  // Apply theme to document
  const applyTheme = (theme: 'dark' | 'light' | 'system') => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('light-theme', !prefersDark);
      root.classList.toggle('dark-theme', prefersDark);
    } else {
      root.classList.toggle('light-theme', theme === 'light');
      root.classList.toggle('dark-theme', theme === 'dark');
    }
  };
  
  // Apply compact mode to the UI
  const applyCompactMode = (isCompact: boolean) => {
    const root = document.documentElement;
    root.classList.toggle('compact-ui', isCompact);
    
    // Add compact mode CSS variables
    if (isCompact) {
      root.style.setProperty('--space-y', '0.5rem');
      root.style.setProperty('--padding-container', '0.75rem');
      root.style.setProperty('--text-base-size', '0.875rem');
    } else {
      root.style.setProperty('--space-y', '1rem');
      root.style.setProperty('--padding-container', '1.5rem');
      root.style.setProperty('--text-base-size', '1rem');
    }
  };
  
  // Apply date format throughout the application
  const applyDateFormat = (format: string) => {
    // Store the format for use by date formatting functions
    window.localStorage.setItem('date_format', format);
  };
  
  // Set up auto logout functionality
  const setupAutoLogout = (minutes: number) => {
    // Clear any existing timer
    if (autoLogoutTimerId) {
      window.clearTimeout(autoLogoutTimerId);
    }
    
    // Setup activity tracking
    const trackActivity = () => {
      lastActivity = Date.now();
    };
    
    // Add event listeners to track user activity
    ['mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      window.addEventListener(event, trackActivity);
    });
    
    // Check for inactivity every minute
    const checkInactivity = () => {
      const inactiveTime = (Date.now() - lastActivity) / 1000 / 60; // in minutes
      
      if (inactiveTime >= minutes) {
        // Log the user out
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        // Check again in a minute
        autoLogoutTimerId = window.setTimeout(checkInactivity, 60000);
      }
    };
    
    // Start monitoring
    autoLogoutTimerId = window.setTimeout(checkInactivity, 60000);
  };
  
  // Apply changes to API configuration
  const updateApiConfig = (apiConfig: typeof settings.api) => {
    console.log('Updating API config', apiConfig);
    // Apply the API configuration 
    // (e.g., update base URLs, timeouts in axios instances, etc.)
    
    // Emit event for other components to react to API config changes
    const event = new CustomEvent('api-config-changed', { detail: apiConfig });
    document.dispatchEvent(event);
  };
  
  // Set up notification handlers
  const setupNotificationHandlers = (notificationSettings: typeof settings.notifications) => {
    console.log('Setting up notification handlers', notificationSettings);
    // Subscribe or unsubscribe from notifications based on settings
    
    // Emit event for other components to react to notification settings changes
    const event = new CustomEvent('notification-settings-changed', { detail: notificationSettings });
    document.dispatchEvent(event);
  };

  const handleSaveSettings = () => {
    setIsLoading(true);
    setMessage(null);

    try {
      // Save settings to localStorage
      localStorage.setItem('phantomhub_settings', JSON.stringify(settings));
      setSavedSettings(settings);
      
      // Apply all settings
      applyTheme(settings.theme);
      applyCompactMode(settings.display.compactView);
      applyDateFormat(settings.display.dateFormat);
      setupAutoLogout(settings.security.autoLogout);
      updateApiConfig(settings.api);
      setupNotificationHandlers(settings.notifications);
      
      // Save settings to backend (commented out for this demo)
      if (settings.security.requireConfirmation) {
        // Register global confirmation handler
        window.confirmSensitiveAction = (action: string) => {
          return window.confirm(`Are you sure you want to ${action}?`);
        };
      } else {
        // Remove confirmation handler
        window.confirmSensitiveAction = (action: string) => true;
      }
      
      setMessage({
        type: 'success',
        text: 'Settings saved and applied successfully'
      });
      
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({
        type: 'error',
        text: 'Failed to save settings. Please try again.'
      });
    } finally {
      setIsLoading(false);
      
      // Clear success message after 3 seconds
      if (message?.type === 'success') {
        setTimeout(() => setMessage(null), 3000);
      }
    }
  };

  const handleThemeChange = (theme: 'dark' | 'light' | 'system') => {
    setSettings(prev => ({
      ...prev,
      theme
    }));
  };

  const handleToggle = (section: keyof SettingsState, key: string) => {
    setSettings(prev => {
      const sectionData = prev[section] as Record<string, unknown>;
      return {
        ...prev,
        [section]: {
          ...sectionData,
          [key]: !sectionData[key]
        }
      };
    });
  };

  const handleInputChange = (section: keyof SettingsState, key: string, value: string | number) => {
    setSettings(prev => {
      const sectionData = prev[section] as Record<string, unknown>;
      return {
        ...prev,
        [section]: {
          ...sectionData,
          [key]: value
        }
      };
    });
  };

  const hasChanges = () => {
    return JSON.stringify(settings) !== JSON.stringify(savedSettings);
  };

  // UI Components
  const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-green-500' : 'bg-slate-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );

  const SettingItem = ({ 
    icon, 
    title, 
    description, 
    children 
  }: { 
    icon: React.ReactNode, 
    title: string, 
    description: string, 
    children: React.ReactNode 
  }) => (
    <div className="flex items-start justify-between p-4 border-b border-slate-700/50">
      <div className="flex items-start">
        <div className="mt-0.5 mr-3 p-2 bg-slate-700/30 rounded-md text-slate-400">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-medium text-white">{title}</h3>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>
      <div className="ml-4">
        {children}
      </div>
    </div>
  );

  const SettingsGroup = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="mb-6 bg-slate-800 border border-slate-700 rounded-md overflow-hidden">
      <div className="flex items-center px-4 py-3 bg-slate-700/30 border-b border-slate-700">
        <div className="mr-2 text-green-500">
          {icon}
        </div>
        <h2 className="text-sm font-medium text-white">{title}</h2>
      </div>
      <div>
        {children}
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white flex items-center">
          <FiSettings className="mr-2 text-green-500" size={20} />
          Settings
        </h1>
        <p className="text-sm text-slate-400">Configure your PhantomHub preferences</p>
      </div>

      {/* Status Messages */}
      {message && (
        <div className={`mb-6 p-3 rounded text-sm ${
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          {/* Theme Settings */}
          <SettingsGroup title="Appearance" icon={<FiMoon size={16} />}>
            <div className="p-4 border-b border-slate-700/50">
              <h3 className="text-sm font-medium text-white mb-3">Theme</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`px-3 py-2 rounded flex items-center justify-center ${
                    settings.theme === 'dark'
                      ? 'bg-green-500/20 text-green-500 border-green-500/30'
                      : 'bg-slate-700/30 text-slate-400 border-slate-600/30'
                  } border`}
                >
                  <FiMoon size={14} className="mr-2" />
                  <span className="text-xs font-medium">Dark</span>
                </button>
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`px-3 py-2 rounded flex items-center justify-center ${
                    settings.theme === 'light'
                      ? 'bg-green-500/20 text-green-500 border-green-500/30'
                      : 'bg-slate-700/30 text-slate-400 border-slate-600/30'
                  } border`}
                >
                  <FiSun size={14} className="mr-2" />
                  <span className="text-xs font-medium">Light</span>
                </button>
                <button
                  onClick={() => handleThemeChange('system')}
                  className={`px-3 py-2 rounded flex items-center justify-center ${
                    settings.theme === 'system'
                      ? 'bg-green-500/20 text-green-500 border-green-500/30'
                      : 'bg-slate-700/30 text-slate-400 border-slate-600/30'
                  } border`}
                >
                  <FiGlobe size={14} className="mr-2" />
                  <span className="text-xs font-medium">System</span>
                </button>
              </div>
            </div>

            <SettingItem
              icon={<FiToggleLeft size={16} />}
              title="Compact View"
              description="Use a more compact UI layout with smaller padding and text"
            >
              <ToggleSwitch
                checked={settings.display.compactView}
                onChange={() => handleToggle('display', 'compactView')}
              />
            </SettingItem>

            <SettingItem
              icon={<FiToggleLeft size={16} />}
              title="Advanced Options"
              description="Show advanced options and features throughout the application"
            >
              <ToggleSwitch
                checked={settings.display.showAdvancedOptions}
                onChange={() => handleToggle('display', 'showAdvancedOptions')}
              />
            </SettingItem>

            <SettingItem
              icon={<FiClock size={16} />}
              title="Date Format"
              description="Choose how dates and times are displayed"
            >
              <select
                value={settings.display.dateFormat}
                onChange={(e) => handleInputChange('display', 'dateFormat', e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </SettingItem>
          </SettingsGroup>

          {/* Notification Settings */}
          <SettingsGroup title="Notifications" icon={<FiBell size={16} />}>
            <SettingItem
              icon={<FiServer size={16} />}
              title="Device Status"
              description="Get notified when device status changes (online, offline, busy)"
            >
              <ToggleSwitch
                checked={settings.notifications.deviceStatus}
                onChange={() => handleToggle('notifications', 'deviceStatus')}
              />
            </SettingItem>

            <SettingItem
              icon={<FiAlertCircle size={16} />}
              title="Deployment Alerts"
              description="Get notified about payload deployment status"
            >
              <ToggleSwitch
                checked={settings.notifications.deploymentAlerts}
                onChange={() => handleToggle('notifications', 'deploymentAlerts')}
              />
            </SettingItem>

            <SettingItem
              icon={<FiGlobe size={16} />}
              title="System Updates"
              description="Get notified about PhantomHub system updates"
            >
              <ToggleSwitch
                checked={settings.notifications.systemUpdates}
                onChange={() => handleToggle('notifications', 'systemUpdates')}
              />
            </SettingItem>

            <SettingItem
              icon={<FiShield size={16} />}
              title="Security Alerts"
              description="Get notified about security-related events"
            >
              <ToggleSwitch
                checked={settings.notifications.securityAlerts}
                onChange={() => handleToggle('notifications', 'securityAlerts')}
              />
            </SettingItem>
          </SettingsGroup>
        </div>

        <div>
          {/* API Settings */}
          <SettingsGroup title="API Configuration" icon={<FiServer size={16} />}>
            <SettingItem
              icon={<FiGlobe size={16} />}
              title="API Endpoint"
              description="Server URL for API requests"
            >
              <input
                type="text"
                value={settings.api.endpoint}
                onChange={(e) => handleInputChange('api', 'endpoint', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
              />
            </SettingItem>

            <SettingItem
              icon={<FiClock size={16} />}
              title="Polling Interval"
              description="Seconds between API status checks"
            >
              <div className="flex items-center">
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={settings.api.pollingInterval}
                  onChange={(e) => handleInputChange('api', 'pollingInterval', parseInt(e.target.value))}
                  className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                />
                <span className="ml-2 text-xs text-slate-400">seconds</span>
              </div>
            </SettingItem>

            <SettingItem
              icon={<FiClock size={16} />}
              title="Request Timeout"
              description="Seconds to wait before timing out requests"
            >
              <div className="flex items-center">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.api.timeout}
                  onChange={(e) => handleInputChange('api', 'timeout', parseInt(e.target.value))}
                  className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                />
                <span className="ml-2 text-xs text-slate-400">seconds</span>
              </div>
            </SettingItem>
          </SettingsGroup>

          {/* Security Settings */}
          <SettingsGroup title="Security" icon={<FiShield size={16} />}>
            <SettingItem
              icon={<FiUser size={16} />}
              title="Auto Logout"
              description="Minutes of inactivity before automatic logout"
            >
              <div className="flex items-center">
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={settings.security.autoLogout}
                  onChange={(e) => handleInputChange('security', 'autoLogout', parseInt(e.target.value))}
                  className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                />
                <span className="ml-2 text-xs text-slate-400">minutes</span>
              </div>
            </SettingItem>

            <SettingItem
              icon={<FiAlertCircle size={16} />}
              title="Confirm Actions"
              description="Require confirmation for sensitive operations"
            >
              <ToggleSwitch
                checked={settings.security.requireConfirmation}
                onChange={() => handleToggle('security', 'requireConfirmation')}
              />
            </SettingItem>
          </SettingsGroup>

          {/* Save Button */}
          <div className="mt-6">
            <button
              onClick={handleSaveSettings}
              disabled={isLoading || !hasChanges()}
              className={`w-full flex items-center justify-center py-2 px-4 rounded font-medium ${
                !hasChanges()
                  ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                  : 'bg-green-500 text-black hover:bg-green-400 shadow-glow-green'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FiSave className="mr-2" size={16} />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 