import { Model, DataTypes, Association } from 'sequelize';
import { sequelize } from '../config/database';
import Payload from './Payload';
import Device from './Device';
import User from './User';

export type DeploymentStatus = 'pending' | 'connected' | 'executing' | 'completed' | 'failed';

export interface DeploymentAttributes {
  id?: string;
  payloadId: string;
  deviceId: string;
  userId: string;
  status: DeploymentStatus;
  result?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class Deployment extends Model<DeploymentAttributes> implements DeploymentAttributes {
  public id!: string;
  public payloadId!: string;
  public deviceId!: string;
  public userId!: string;
  public status!: DeploymentStatus;
  public result!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Define associations
  public static associations: {
    payload: Association<Deployment, Payload>;
    device: Association<Deployment, Device>;
    initiator: Association<Deployment, User>;
  };
}

Deployment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    payloadId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Payload,
        key: 'id',
      },
      field: 'payload_id',
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
    underscored: true,
    indexes: [
      {
        fields: ['user_id'],
        // Index for finding deployments by user
      },
      {
        fields: ['device_id'],
        // Index for finding deployments by device
      },
      {
        fields: ['payload_id'],
        // Index for finding deployments by payload
      },
      {
        fields: ['status'],
        // Index for filtering deployments by status
      },
      {
        fields: ['createdAt'],
        // Index for sorting/filtering by creation date
      },
      {
        // Composite index for common query patterns
        fields: ['user_id', 'status']
      }
    ]
  }
);

// Define associations
Deployment.belongsTo(Payload, { foreignKey: 'payload_id', as: 'payload' });
Deployment.belongsTo(Device, { foreignKey: 'device_id', as: 'device' });
Deployment.belongsTo(User, { foreignKey: 'user_id', as: 'initiator' });

export default Deployment; 