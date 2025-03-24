import { Request, Response } from 'express';
import UserSettings from '../models/UserSettings';

// Define AuthRequest type to include user property
interface AuthRequest extends Request {
  user?: {
    id: number;
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
      where: { userId },
      defaults: {
        userId,
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
    });

    // Format the data to match the frontend structure
    const formattedSettings = {
      theme: settings.theme,
      notifications: settings.notificationSettings,
      api: settings.apiSettings,
      display: settings.displaySettings,
      security: settings.securitySettings,
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

    const { theme, notifications, api, display, security } = req.body;

    // Find or create user settings
    const [settings, created] = await UserSettings.findOrCreate({
      where: { userId },
      defaults: {
        userId,
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
    });

    // Update with new values, keeping existing values where not provided
    const updatedSettings = await settings.update({
      theme: theme || settings.theme,
      notificationSettings: notifications ? {
        ...settings.notificationSettings,
        ...notifications,
      } : settings.notificationSettings,
      apiSettings: api ? {
        ...settings.apiSettings,
        ...api,
      } : settings.apiSettings,
      displaySettings: display ? {
        ...settings.displaySettings,
        ...display,
      } : settings.displaySettings,
      securitySettings: security ? {
        ...settings.securitySettings,
        ...security,
      } : settings.securitySettings,
    });

    // Format the data to match the frontend structure
    const formattedSettings = {
      theme: updatedSettings.theme,
      notifications: updatedSettings.notificationSettings,
      api: updatedSettings.apiSettings,
      display: updatedSettings.displaySettings,
      security: updatedSettings.securitySettings,
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