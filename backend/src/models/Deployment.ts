import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import Payload from './Payload';
import Device from './Device';
import User from './User';

type DeploymentStatus = 'pending' | 'connected' | 'executing' | 'completed' | 'failed';

interface DeploymentAttributes {
  id: number;
  payloadId: number;
  deviceId: number;
  userId: number;
  status: DeploymentStatus;
  result: string | null;
}

interface DeploymentCreationAttributes {
  payloadId: number;
  deviceId: number;
  userId: number;
  status?: DeploymentStatus;
}

class Deployment extends Model<DeploymentAttributes, DeploymentCreationAttributes> implements DeploymentAttributes {
  public id!: number;
  public payloadId!: number;
  public deviceId!: number;
  public userId!: number;
  public status!: DeploymentStatus;
  public result!: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Deployment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    payloadId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'payloads',
        key: 'id',
      },
    },
    deviceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'devices',
        key: 'id',
      },
    },
    userId: {
      type: DataTypes.INTEGER,
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
  },
  {
    sequelize,
    modelName: 'Deployment',
    tableName: 'deployments',
  }
);

// Define associations
Deployment.belongsTo(Payload, { foreignKey: 'payloadId', as: 'payload' });
Deployment.belongsTo(Device, { foreignKey: 'deviceId', as: 'device' });
Deployment.belongsTo(User, { foreignKey: 'userId', as: 'initiator' });

export { DeploymentStatus };
export default Deployment; 