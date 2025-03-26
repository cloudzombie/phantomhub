import { Model, DataTypes, Association } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';

interface UserSettingsAttributes {
  id?: string;
  userId: string;
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
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserSettingsCreationAttributes extends Omit<UserSettingsAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class UserSettings extends Model<UserSettingsAttributes, UserSettingsCreationAttributes> implements UserSettingsAttributes {
  public id!: string;
  public userId!: string;
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

  // Define associations
  public static associations: {
    user: Association<UserSettings, User>;
  };
}

UserSettings.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      unique: true,
      field: 'user_id',
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
      field: 'notification_settings',
    },
    apiSettings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        endpoint: 'http://localhost:5001/api',
        pollingInterval: 60,
        timeout: 30,
      },
      field: 'api_settings',
    },
    displaySettings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        compactView: false,
        showAdvancedOptions: true,
        dateFormat: 'MM/DD/YYYY',
      },
      field: 'display_settings',
    },
    securitySettings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        autoLogout: 30,
        requireConfirmation: true,
      },
      field: 'security_settings',
    },
  },
  {
    sequelize,
    modelName: 'UserSettings',
    tableName: 'user_settings',
    underscored: true,
    indexes: [
      {
        fields: ['user_id'],
        unique: true,
        // Important index for quickly retrieving settings by user
      }
    ]
  }
);

// Define association with User model
UserSettings.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export default UserSettings; 