import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import Payload from './Payload';
import Script from './Script';

interface PayloadScriptAttributes {
  id?: string;
  payloadId: string;
  scriptId: string;
  executionOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

class PayloadScript extends Model<PayloadScriptAttributes> implements PayloadScriptAttributes {
  public id!: string;
  public payloadId!: string;
  public scriptId!: string;
  public executionOrder!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PayloadScript.init(
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
    scriptId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Script,
        key: 'id',
      },
      field: 'script_id',
    },
    executionOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'execution_order',
    },
  },
  {
    sequelize,
    modelName: 'PayloadScript',
    tableName: 'payload_scripts',
    underscored: true,
    indexes: [
      {
        fields: ['payload_id'],
      },
      {
        fields: ['script_id'],
      },
      {
        fields: ['payload_id', 'script_id'],
        unique: true,
      },
    ],
  }
);

export default PayloadScript; 