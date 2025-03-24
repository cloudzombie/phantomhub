import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

interface DeviceAttributes {
  id: number;
  name: string;
  ipAddress: string;
  firmwareVersion: string | null;
  lastCheckIn: Date | null;
  status: 'online' | 'offline' | 'busy';
}

interface DeviceCreationAttributes {
  name: string;
  ipAddress: string;
  firmwareVersion?: string;
  status?: 'online' | 'offline' | 'busy';
}

class Device extends Model<DeviceAttributes, DeviceCreationAttributes> implements DeviceAttributes {
  public id!: number;
  public name!: string;
  public ipAddress!: string;
  public firmwareVersion!: string | null;
  public lastCheckIn!: Date | null;
  public status!: 'online' | 'offline' | 'busy';

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
  },
  {
    sequelize,
    modelName: 'Device',
    tableName: 'devices',
  }
);

export default Device; 