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
import ThemeService from '../services/ThemeService';
import { api } from '../services/api';
import NotificationService from '../services/NotificationService';
import { safeLogout } from '../utils/tokenManager';

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
  const apiConfig = api.getConfig();
  const notificationConfig = NotificationService.getSettings();

  // Ensure all settings have default values to prevent undefined errors
  const defaultSettings: SettingsState = {
    theme: themeConfig.theme,
    notifications: {
      deviceStatus: true,
      deploymentAlerts: true,
      systemUpdates: false,
      securityAlerts: true,
    },
    api: {
      endpoint: apiConfig.endpoint,
      pollingInterval: 60,
      timeout: 30,
    },
    display: {
      compactView: themeConfig.compactView,
      showAdvancedOptions: true,
      dateFormat: themeConfig.dateFormat,
    },
    security: {
      autoLogout: 30,
      requireConfirmation: true,
    }
  };

  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [savedSettings, setSavedSettings] = useState<SettingsState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Helper function to get current user ID
  const getCurrentUserId = (): string | null => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id || null;
      }
    } catch (error) {
      console.error('Error getting current user ID:', error);
    }
    return null;
  };

  // Helper function to get settings key
  const getSettingsKey = (): string => {
    const userId = getCurrentUserId();
    return userId ? `phantomhub_settings_${userId}` : 'phantomhub_settings';
  };

  useEffect(() => {
    // Load settings function
    const loadSettings = async () => {
      try {
        console.log('Trying to load settings from API...');
        // Try to get settings from API first
        const response = await api.get('/users/settings');
        console.log('API settings response:', response);
        
        if (response && response.success && response.data) {
          // Apply validated settings from API
          console.log('Setting state with API settings');
          setSettings(response.data);
          setSavedSettings(response.data);
          
          // Apply auto logout settings
          setupAutoLogout(response.data.security.autoLogout);
        } else {
          console.log('API settings not found or invalid, falling back to localStorage');
          // Fall back to localStorage if API fails
          loadFromLocalStorage();
        }
      } catch (error) {
        console.error('Error loading settings from API:', error);
        // Fall back to localStorage
        console.log('Falling back to localStorage due to API error');
        loadFromLocalStorage();
      }
    };
    
    // Helper function to load from localStorage
    const loadFromLocalStorage = () => {
      const settingsKey = getSettingsKey();
      const storedSettings = localStorage.getItem(settingsKey);
      if (storedSettings) {
        try {
          const parsedSettings = JSON.parse(storedSettings);
          
          // Ensure the parsed settings have all required properties with fallbacks
          const validatedSettings: SettingsState = {
            theme: parsedSettings.theme || defaultSettings.theme,
            notifications: {
              deviceStatus: parsedSettings.notifications?.deviceStatus ?? defaultSettings.notifications.deviceStatus,
              deploymentAlerts: parsedSettings.notifications?.deploymentAlerts ?? defaultSettings.notifications.deploymentAlerts,
              systemUpdates: parsedSettings.notifications?.systemUpdates ?? defaultSettings.notifications.systemUpdates,
              securityAlerts: parsedSettings.notifications?.securityAlerts ?? defaultSettings.notifications.securityAlerts,
            },
            api: {
              endpoint: parsedSettings.api?.endpoint || defaultSettings.api.endpoint,
              pollingInterval: parsedSettings.api?.pollingInterval || defaultSettings.api.pollingInterval,
              timeout: parsedSettings.api?.timeout || defaultSettings.api.timeout,
            },
            display: {
              compactView: parsedSettings.display?.compactView ?? defaultSettings.display.compactView,
              showAdvancedOptions: parsedSettings.display?.showAdvancedOptions ?? defaultSettings.display.showAdvancedOptions,
              dateFormat: parsedSettings.display?.dateFormat || defaultSettings.display.dateFormat,
            },
            security: {
              autoLogout: parsedSettings.security?.autoLogout || defaultSettings.security.autoLogout,
              requireConfirmation: parsedSettings.security?.requireConfirmation ?? defaultSettings.security.requireConfirmation,
            }
          };
          
          setSettings(validatedSettings);
          setSavedSettings(validatedSettings);
          
          // Apply auto logout settings (with fallback)
          setupAutoLogout(validatedSettings.security.autoLogout);
        } catch (error) {
          console.error('Error parsing stored settings:', error);
          // If parse error, use default settings
          setupAutoLogout(defaultSettings.security.autoLogout);
        }
      } else {
        // If no stored settings, use defaults
        setupAutoLogout(defaultSettings.security.autoLogout);
      }
    };
    
    // Start loading process
    loadSettings();
    
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
        // Clear user-specific settings before logout
        const userId = getCurrentUserId();
        if (userId) {
          localStorage.removeItem(`phantomhub_settings_${userId}`);
        }
        
        // Log the user out safely without directly removing tokens
        // This will redirect to login with the action=logout parameter
        // which will properly handle the logout process
        safeLogout();
      } else {
        // Check again in a minute
        autoLogoutTimerId = window.setTimeout(checkInactivity, 60000);
      }
    };
    
    // Start monitoring
    autoLogoutTimerId = window.setTimeout(checkInactivity, 60000);
  };
  
  // Save and apply all settings
  const handleSaveSettings = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      // First, try to save settings to the API
      try {
        console.log('Saving settings to API:', settings);
        const response = await api.post('/users/settings', settings);
        console.log('API response:', response);
        
        if (!response.success) {
          console.warn('API save failed, falling back to localStorage only');
          // We'll continue and save to localStorage as a fallback
        }
      } catch (apiError) {
        console.error('Error saving to API:', apiError);
        // Continue with localStorage as a fallback
      }
      
      // Always save to localStorage as a fallback
      const settingsKey = getSettingsKey();
      localStorage.setItem(settingsKey, JSON.stringify(settings));
      
      // Apply theme settings
      ThemeService.setTheme(settings.theme);
      ThemeService.setCompactView(settings.display.compactView);
      ThemeService.setDateFormat(settings.display.dateFormat);
      
      // Update API service config
      const apiConfigChangeEvent = new CustomEvent('api-config-changed', {
        detail: settings.api
      });
      document.dispatchEvent(apiConfigChangeEvent);
      
      // Update notification settings
      const notificationSettingsChangeEvent = new CustomEvent('notification-settings-changed', {
        detail: settings.notifications
      });
      document.dispatchEvent(notificationSettingsChangeEvent);
      
      // Apply auto logout settings
      setupAutoLogout(settings.security.autoLogout);
      
      // Update saved state reference
      setSavedSettings({...settings});
      
      // Show success message
      setMessage({
        type: 'success',
        text: 'Settings saved successfully'
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({
        type: 'error',
        text: 'Failed to save settings'
      });
    } finally {
      setIsLoading(false);
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
    if (section === 'api' && key === 'endpoint') {
      // Don't allow changing the API endpoint
      return;
    }
    setSettings(prev => {
      const updatedSection = { ...prev[section] as Record<string, unknown> };
      updatedSection[key] = value;
      return {
        ...prev,
        [section]: updatedSection
      };
    });
  };

  const hasChanges = () => {
    return JSON.stringify(settings) !== JSON.stringify(savedSettings);
  };

  // Add a debug function to check localStorage settings for the current user
  const getStoredSettings = () => {
    try {
      const userId = getCurrentUserId();
      const key = getSettingsKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    } catch (error) {
      console.error('Error getting stored settings:', error);
      return null;
    }
  };

  return (
    <div className="p-6 bg-primary text-primary">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-primary flex items-center">
          <FiSettings className="mr-2 text-green-500" size={20} />
          Settings
        </h1>
        <p className="text-sm text-secondary">Configure your GhostWire preferences</p>
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
              description="Get notified about GhostWire system updates"
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
              description="Server URL for API requests (read-only)"
            >
              <input
                type="text"
                value="https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api"
                disabled
                className="w-full bg-slate-700/50 border border-slate-600 rounded px-2 py-1 text-xs cursor-not-allowed opacity-75"
                title="API endpoint is configured in production"
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
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={isLoading || !hasChanges()}
              className={`px-4 py-2 rounded flex items-center ${
                hasChanges()
                  ? 'bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500/20'
                  : 'bg-slate-700/30 text-slate-500 border-slate-600/30 cursor-not-allowed'
              } border transition-colors`}
            >
              {isLoading ? (
                <>
                  <span className="animate-pulse">Saving...</span>
                </>
              ) : (
                <>
                  <FiSave size={16} className="mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Debug Info - Always hidden in production deployment */}
      {false && (
        <div className="mt-12 p-4 border border-dashed border-slate-700 rounded text-slate-500 text-xs">
          <h3 className="font-medium mb-2">Debug Info</h3>
          <p>User ID: {getCurrentUserId() || 'Not logged in'}</p>
          <p>Settings Key: {getSettingsKey()}</p>
          <p>Current Theme: {settings.theme}</p>
          <p>ThemeService Theme: {ThemeService.getConfig().theme}</p>
          <details>
            <summary className="cursor-pointer">Stored Settings</summary>
            <pre className="mt-2 p-2 bg-slate-800 rounded overflow-auto max-h-48">
              {JSON.stringify(getStoredSettings(), null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default Settings; 