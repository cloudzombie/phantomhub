/**
 * Device Model
 * 
 * Represents an O.MG Cable device in the system
 */

import { Model, DataTypes, Association } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';

export interface DeviceAttributes {
  id?: string;
  name: string;
  userId: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  connectionType: 'usb' | 'network';
  ipAddress?: string;
  serialPortId?: string;
  firmwareVersion?: string;
  lastSeen?: Date;
  batteryLevel?: number;
  signalStrength?: number;
  errors?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

class Device extends Model<DeviceAttributes> implements DeviceAttributes {
  public id!: string;
  public name!: string;
  public userId!: string;
  public status!: 'online' | 'offline' | 'error' | 'maintenance';
  public connectionType!: 'usb' | 'network';
  public ipAddress!: string;
  public serialPortId!: string;
  public firmwareVersion!: string;
  public lastSeen!: Date;
  public batteryLevel!: number;
  public signalStrength!: number;
  public errors!: string[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Define associations
  public static associations: {
    owner: Association<Device, User>;
  };
}

Device.init(
  {
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
        model: User,
        key: 'id',
      },
      field: 'user_id',
    },
    status: {
      type: DataTypes.ENUM('online', 'offline', 'error', 'maintenance'),
      allowNull: false,
      defaultValue: 'offline',
    },
    connectionType: {
      type: DataTypes.ENUM('usb', 'network'),
      allowNull: false,
      field: 'connection_type',
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIP: true,
      },
      field: 'ip_address',
    },
    serialPortId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'serial_port_id',
    },
    firmwareVersion: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'firmware_version',
    },
    lastSeen: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_seen',
    },
    batteryLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
      field: 'battery_level',
    },
    signalStrength: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
      field: 'signal_strength',
    },
    errors: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
  },
  {
    sequelize,
    modelName: 'Device',
    tableName: 'devices',
    underscored: true,
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['status'],
      },
    ],
  }
);

// Define associations
Device.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'owner',
});

export default Device; 