import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { User } from './User';

interface UserSettingsAttributes {
  id: number;
  userId: number;
  theme: 'dark' | 'light' | 'system';
  notificationSettings: {
    deviceStatus: boolean;
    deploymentAlerts: boolean;
    systemUpdates: boolean;
    securityAlerts: boolean;
  };
  apiSettings: {
    endpoint: string;
    pollingInterval: number;
    timeout: number;
  };
  displaySettings: {
    compactView: boolean;
    showAdvancedOptions: boolean;
    dateFormat: string;
  };
  securitySettings: {
    autoLogout: number;
    requireConfirmation: boolean;
  };
}

interface UserSettingsCreationAttributes {
  userId: number;
  theme?: 'dark' | 'light' | 'system';
  notificationSettings?: {
    deviceStatus?: boolean;
    deploymentAlerts?: boolean;
    systemUpdates?: boolean;
    securityAlerts?: boolean;
  };
  apiSettings?: {
    endpoint?: string;
    pollingInterval?: number;
    timeout?: number;
  };
  displaySettings?: {
    compactView?: boolean;
    showAdvancedOptions?: boolean;
    dateFormat?: string;
  };
  securitySettings?: {
    autoLogout?: number;
    requireConfirmation?: boolean;
  };
}

class UserSettings extends Model<UserSettingsAttributes, UserSettingsCreationAttributes> implements UserSettingsAttributes {
  public id!: number;
  public userId!: number;
  public theme!: 'dark' | 'light' | 'system';
  public notificationSettings!: {
    deviceStatus: boolean;
    deploymentAlerts: boolean;
    systemUpdates: boolean;
    securityAlerts: boolean;
  };
  public apiSettings!: {
    endpoint: string;
    pollingInterval: number;
    timeout: number;
  };
  public displaySettings!: {
    compactView: boolean;
    showAdvancedOptions: boolean;
    dateFormat: string;
  };
  public securitySettings!: {
    autoLogout: number;
    requireConfirmation: boolean;
  };

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserSettings.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      unique: true,
    },
    theme: {
      type: DataTypes.ENUM('dark', 'light', 'system'),
      allowNull: false,
      defaultValue: 'dark',
    },
    notificationSettings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        deviceStatus: true,
        deploymentAlerts: true,
        systemUpdates: false,
        securityAlerts: true,
      },
    },
    apiSettings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        endpoint: 'http://localhost:5001/api',
        pollingInterval: 60,
        timeout: 30,
      },
    },
    displaySettings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        compactView: false,
        showAdvancedOptions: true,
        dateFormat: 'MM/DD/YYYY',
      },
    },
    securitySettings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        autoLogout: 30,
        requireConfirmation: true,
      },
    },
  },
  {
    sequelize,
    modelName: 'UserSettings',
    tableName: 'user_settings',
  }
);

// Define association with User model
UserSettings.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(UserSettings, { foreignKey: 'userId', as: 'settings' });

export default UserSettings; 