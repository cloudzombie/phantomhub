import { Model, DataTypes, Association } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';

// Define nested interface types for better organization
interface NotificationSettings {
  deviceStatus: boolean;
  deploymentAlerts: boolean;
  systemUpdates: boolean;
  securityAlerts: boolean;
}

interface ApiSettings {
  endpoint: string;
  pollingInterval: number;
  timeout: number;
}

interface DisplaySettings {
  compactView: boolean;
  showAdvancedOptions: boolean;
  dateFormat: string;
}

interface SecuritySettings {
  autoLogout: number;
  requireConfirmation: boolean;
}

interface SettingsObject {
  theme: 'dark' | 'light' | 'system';
  notificationSettings: NotificationSettings;
  apiSettings: ApiSettings;
  displaySettings: DisplaySettings;
  securitySettings: SecuritySettings;
}

interface UserSettingsAttributes {
  id?: string;
  userId: string;
  settings: SettingsObject;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserSettingsCreationAttributes extends Omit<UserSettingsAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class UserSettings extends Model<UserSettingsAttributes, UserSettingsCreationAttributes> implements UserSettingsAttributes {
  public id!: string;
  public userId!: string;
  public settings!: {
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
  };

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  
  // Getter methods to make it easier to access nested fields
  get theme(): 'dark' | 'light' | 'system' {
    return this.settings.theme;
  }
  
  get notificationSettings(): NotificationSettings {
    return this.settings.notificationSettings;
  }
  
  get apiSettings(): ApiSettings {
    return this.settings.apiSettings;
  }
  
  get displaySettings(): DisplaySettings {
    return this.settings.displaySettings;
  }
  
  get securitySettings(): SecuritySettings {
    return this.settings.securitySettings;
  }

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
    settings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
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