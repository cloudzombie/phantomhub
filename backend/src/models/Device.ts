import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

interface DeviceAttributes {
  id: number;
  name: string;
  ipAddress: string;
  firmwareVersion: string | null;
  lastCheckIn: Date | null;
  status: 'online' | 'offline' | 'busy';
  connectionType: 'network' | 'usb';
  serialPortId: string | null;
  userId: number;
}

interface DeviceCreationAttributes {
  name: string;
  ipAddress: string;
  userId: number;
  firmwareVersion?: string;
  status?: 'online' | 'offline' | 'busy';
  connectionType?: 'network' | 'usb';
  serialPortId?: string;
}

class Device extends Model<DeviceAttributes, DeviceCreationAttributes> implements DeviceAttributes {
  public id!: number;
  public name!: string;
  public ipAddress!: string;
  public firmwareVersion!: string | null;
  public lastCheckIn!: Date | null;
  public status!: 'online' | 'offline' | 'busy';
  public connectionType!: 'network' | 'usb';
  public serialPortId!: string | null;
  public userId!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Device.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    ipAddress: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIP: true,
      },
    },
    firmwareVersion: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    lastCheckIn: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('online', 'offline', 'busy'),
      allowNull: false,
      defaultValue: 'offline',
    },
    connectionType: {
      type: DataTypes.ENUM('network', 'usb'),
      allowNull: false,
      defaultValue: 'network',
    },
    serialPortId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'Device',
    tableName: 'devices',
  }
);

// Define association with User
Device.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

export default Device; 