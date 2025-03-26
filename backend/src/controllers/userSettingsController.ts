import { Request, Response } from 'express';
import UserSettings from '../models/UserSettings';
import { IncludeOptions } from 'sequelize';

// Define interfaces for request bodies
interface NotificationSettings {
  deviceStatus?: boolean;
  deploymentAlerts?: boolean;
  systemUpdates?: boolean;
  securityAlerts?: boolean;
}

interface ApiSettings {
  endpoint?: string;
  pollingInterval?: number;
  timeout?: number;
}

interface DisplaySettings {
  compactView?: boolean;
  showAdvancedOptions?: boolean;
  dateFormat?: string;
}

interface SecuritySettings {
  autoLogout?: number;
  requireConfirmation?: boolean;
}

interface SettingsInput {
  theme?: 'dark' | 'light' | 'system';
  notificationSettings?: NotificationSettings;
  apiSettings?: ApiSettings;
  displaySettings?: DisplaySettings;
  securitySettings?: SecuritySettings;
}

// Define AuthRequest type to include user property
interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

// Get user settings
export const getUserSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    // Find user settings or create with defaults if they don't exist
    const [settings, created] = await UserSettings.findOrCreate({
      where: { userId: userId },
      defaults: {
        userId,
        settings: {
          theme: 'dark',
          notificationSettings: {
            deviceStatus: true,
            deploymentAlerts: true,
            systemUpdates: false,
            securityAlerts: true,
          },
          apiSettings: {
            endpoint: 'http://localhost:5001/api',
            pollingInterval: 60,
            timeout: 30,
          },
          displaySettings: {
            compactView: false,
            showAdvancedOptions: true,
            dateFormat: 'MM/DD/YYYY',
          },
          securitySettings: {
            autoLogout: 30,
            requireConfirmation: true,
          },
        },
      },
    });

    // Format the data to match the frontend structure
    const formattedSettings = {
      theme: settings.settings.theme,
      notifications: settings.settings.notificationSettings,
      api: settings.settings.apiSettings,
      display: settings.settings.displaySettings,
      security: settings.settings.securitySettings,
    };

    res.status(200).json({
      success: true,
      data: formattedSettings,
      created,
    });
  } catch (error) {
    console.error('Error getting user settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user settings',
      error: (error as Error).message,
    });
  }
};

// Update user settings
export const updateUserSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const { theme, notifications, api, display, security } = req.body as {
      theme?: 'dark' | 'light' | 'system';
      notifications?: NotificationSettings;
      api?: ApiSettings;
      display?: DisplaySettings;
      security?: SecuritySettings;
    };

    // Find or create user settings
    const [settings, created] = await UserSettings.findOrCreate({
      where: { userId: userId },
      defaults: {
        userId,
        settings: {
          theme: 'dark',
          notificationSettings: {
            deviceStatus: true,
            deploymentAlerts: true,
            systemUpdates: false,
            securityAlerts: true,
          },
          apiSettings: {
            endpoint: 'http://localhost:5001/api',
            pollingInterval: 60,
            timeout: 30,
          },
          displaySettings: {
            compactView: false,
            showAdvancedOptions: true,
            dateFormat: 'MM/DD/YYYY',
          },
          securitySettings: {
            autoLogout: 30,
            requireConfirmation: true,
          },
        },
      },
    });

    // Make sure settings exists with default values if needed
    const currentSettings = settings.settings || {
        theme: 'dark',
        notificationSettings: {
          deviceStatus: true,
          deploymentAlerts: true,
          systemUpdates: false,
          securityAlerts: true,
        },
        apiSettings: {
          endpoint: 'http://localhost:5001/api',
          pollingInterval: 60,
          timeout: 30,
        },
        displaySettings: {
          compactView: false,
          showAdvancedOptions: true,
          dateFormat: 'MM/DD/YYYY',
        },
        securitySettings: {
          autoLogout: 30,
          requireConfirmation: true,
        },
      };
    
    // Create the updated settings object based on the current settings
    const updatedSettingsObject = { ...currentSettings };
    
    if (theme) {
      updatedSettingsObject.theme = theme;
    }
    
    if (notifications) {
      updatedSettingsObject.notificationSettings = {
        ...updatedSettingsObject.notificationSettings,
        ...notifications,
      };
    }
    
    if (api) {
      updatedSettingsObject.apiSettings = {
        ...updatedSettingsObject.apiSettings,
        ...api,
      };
    }
    
    if (display) {
      updatedSettingsObject.displaySettings = {
        ...updatedSettingsObject.displaySettings,
        ...display,
      };
    }
    
    if (security) {
      updatedSettingsObject.securitySettings = {
        ...updatedSettingsObject.securitySettings,
        ...security,
      };
    }
    
    // Update the settings field with the new composite object
    const updatedSettings = await settings.update({
      settings: updatedSettingsObject
    });

    // Format the data to match the frontend structure
    const formattedSettings = {
      theme: updatedSettings.settings.theme,
      notifications: updatedSettings.settings.notificationSettings,
      api: updatedSettings.settings.apiSettings,
      display: updatedSettings.settings.displaySettings,
      security: updatedSettings.settings.securitySettings,
    };

    res.status(200).json({
      success: true,
      data: formattedSettings,
      created,
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user settings',
      error: (error as Error).message,
    });
  }
}; 