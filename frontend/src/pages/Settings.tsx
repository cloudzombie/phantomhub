import { useState, useEffect } from 'react';
import { 
  FiSave, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiToggleLeft, 
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

// Import services
import ApiService from '../services/ApiService';
import NotificationService from '../services/NotificationService';
import ThemeService from '../services/ThemeService';

// Import UI components
import ThemeToggle from '../components/ui/ThemeToggle';
import ToggleSwitch from '../components/ui/ToggleSwitch';
import SettingItem from '../components/ui/SettingItem';
import SettingsGroup from '../components/ui/SettingsGroup';

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
  // Initialize settings state from services
  const themeConfig = ThemeService.getConfig();
  const apiConfig = ApiService.getConfig();
  const notificationConfig = NotificationService.getSettings();

  const [settings, setSettings] = useState<SettingsState>({
    theme: themeConfig.theme,
    notifications: notificationConfig,
    api: apiConfig,
    display: {
      compactView: themeConfig.compactView,
      showAdvancedOptions: true,
      dateFormat: themeConfig.dateFormat,
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
        
        // Apply auto logout settings
        setupAutoLogout(parsedSettings.security.autoLogout);
      } catch (error) {
        console.error('Error parsing stored settings:', error);
      }
    } else {
      // If no stored settings, apply defaults
      setupAutoLogout(settings.security.autoLogout);
    }
    
    // Listen for theme changes
    const handleThemeChange = (config: typeof themeConfig) => {
      setSettings(prev => ({
        ...prev,
        theme: config.theme,
        display: {
          ...prev.display,
          compactView: config.compactView,
          dateFormat: config.dateFormat
        }
      }));
    };
    
    ThemeService.addListener(handleThemeChange);
    
    return () => {
      // Clean up when component unmounts
      window.clearTimeout(autoLogoutTimerId);
      ThemeService.removeListener(handleThemeChange);
    };
  }, []);
  
  // Auto logout timer
  let autoLogoutTimerId: number;
  let lastActivity = Date.now();
  
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
  
  // Save and apply all settings
  const handleSaveSettings = () => {
    setIsLoading(true);
    setMessage(null);

    try {
      // Save settings to localStorage
      localStorage.setItem('phantomhub_settings', JSON.stringify(settings));
      setSavedSettings(settings);
      
      // Apply all settings using services
      ThemeService.setTheme(settings.theme);
      ThemeService.setCompactView(settings.display.compactView);
      ThemeService.setDateFormat(settings.display.dateFormat);
      
      // Update API configuration
      const event = new CustomEvent('api-config-changed', { detail: settings.api });
      document.dispatchEvent(event);
      
      // Update notification settings
      const notifyEvent = new CustomEvent('notification-settings-changed', { detail: settings.notifications });
      document.dispatchEvent(notifyEvent);
      
      // Update auto logout
      setupAutoLogout(settings.security.autoLogout);
      
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

  return (
    <div className="p-6 bg-primary text-primary">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-primary flex items-center">
          <FiSettings className="mr-2 text-green-500" size={20} />
          Settings
        </h1>
        <p className="text-sm text-secondary">Configure your PhantomHub preferences</p>
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
              <ThemeToggle />
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