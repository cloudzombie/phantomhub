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
      validate: {
        isIP: true,
      },
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
      validate: {
        min: 0,
        max: 100,
      },
    },
    signalStrength: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
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
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['status'],
      },
    ],
  }
);

// Define associations
Device.belongsTo(User, {
  foreignKey: 'userId',
  as: 'owner',
});

export default Device; 