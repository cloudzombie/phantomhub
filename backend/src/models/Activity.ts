/**
 * Activity Model
 * 
 * Tracks device activities and events in the system
 */

import { Model, DataTypes, Association } from 'sequelize';
import { sequelize } from '../config/database';
import Device from './Device';
import User from './User';

export interface ActivityAttributes {
  id: string;
  deviceId: string;
  userId: string;
  type: 'connection' | 'disconnection' | 'firmware_update' | 'error' | 'command' | 'status_change';
  description: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

class Activity extends Model<ActivityAttributes> implements ActivityAttributes {
  public id!: string;
  public deviceId!: string;
  public userId!: string;
  public type!: 'connection' | 'disconnection' | 'firmware_update' | 'error' | 'command' | 'status_change';
  public description!: string;
  public metadata!: Record<string, any>;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Define associations
  public static associations: {
    device: Association<Activity, Device>;
    user: Association<Activity, User>;
  };
}

Activity.init(
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
      type: DataTypes.ENUM('connection', 'disconnection', 'firmware_update', 'error', 'command', 'status_change'),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'Activity',
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
        fields: ['createdAt'],
      },
    ],
  }
);

// Define associations
Activity.belongsTo(Device, {
  foreignKey: 'device_id',
  as: 'device',
});

Activity.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

export default Activity; 