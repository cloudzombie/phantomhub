/**
 * Command Model
 * 
 * Stores and manages commands sent to O.MG Cable devices
 */

import { Model, DataTypes, Association } from 'sequelize';
import { sequelize } from '../config/database';
import Device from './Device';
import User from './User';

export interface CommandAttributes {
  id: string;
  deviceId: string;
  userId: string;
  type: 'ducky' | 'firmware' | 'config' | 'system';
  content: string;
  status: 'pending' | 'sent' | 'completed' | 'failed';
  result?: string;
  error?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

class Command extends Model<CommandAttributes> implements CommandAttributes {
  public id!: string;
  public deviceId!: string;
  public userId!: string;
  public type!: 'ducky' | 'firmware' | 'config' | 'system';
  public content!: string;
  public status!: 'pending' | 'sent' | 'completed' | 'failed';
  public result!: string;
  public error!: string;
  public metadata!: Record<string, any>;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Define associations
  public static associations: {
    device: Association<Command, Device>;
    user: Association<Command, User>;
  };
}

Command.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    deviceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Device,
        key: 'id',
      },
      field: 'device_id',
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
    type: {
      type: DataTypes.ENUM('ducky', 'firmware', 'config', 'system'),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    result: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'Command',
    underscored: true,
    indexes: [
      {
        fields: ['device_id'],
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['type'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['createdAt'],
      },
    ],
  }
);

// Define associations
Command.belongsTo(Device, {
  foreignKey: 'device_id',
  as: 'device',
});

Command.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

export default Command; 