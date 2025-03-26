const { DataTypes } = require('sequelize');

/**
 * @param {import('sequelize').QueryInterface} queryInterface
 */
const up = async (queryInterface) => {
  // Create Users table
  await queryInterface.createTable('users', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('admin', 'user'),
      allowNull: false,
      defaultValue: 'user',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // Create Devices table
  await queryInterface.createTable('devices', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('online', 'offline', 'error', 'maintenance'),
      allowNull: false,
      defaultValue: 'offline',
    },
    connectionType: {
      type: DataTypes.ENUM('usb', 'network'),
      allowNull: false,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    serialPortId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    firmwareVersion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastSeen: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    batteryLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    signalStrength: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    errors: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // Add indexes for devices table
  await queryInterface.addIndex('devices', ['userId'], {
    name: 'devices_user_id'
  });
  await queryInterface.addIndex('devices', ['status'], {
    name: 'devices_status'
  });

  // Create Payloads table
  await queryInterface.createTable('payloads', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    script: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // Create Deployments table
  await queryInterface.createTable('deployments', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    payloadId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'payloads',
        key: 'id',
      },
    },
    deviceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'devices',
        key: 'id',
      },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'connected', 'executing', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    result: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // Create UserSettings table
  await queryInterface.createTable('user_settings', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
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
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });
}

/**
 * @param {import('sequelize').QueryInterface} queryInterface
 */
const down = async (queryInterface) => {
  await queryInterface.dropTable('user_settings');
  await queryInterface.dropTable('deployments');
  await queryInterface.dropTable('payloads');
  await queryInterface.dropTable('devices');
  await queryInterface.dropTable('users');
} 