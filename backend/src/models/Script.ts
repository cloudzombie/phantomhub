import { Model, DataTypes, Association } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';
import Payload from './Payload';
import { Op } from 'sequelize';

export interface ScriptAttributes {
  id?: string;
  name: string;
  content: string;
  /**
   * Script types:
   * - callback: Safe, just records the callback and updates counters
   * - exfiltration: Safe, stores data and forwards to callback URL if specified
   * - command: Executed in a secure Node.js VM sandbox with strict limitations and no file/network access
   * - custom: Safe, client-side handling only
   */
  type: 'callback' | 'exfiltration' | 'command' | 'custom';
  description: string | null;
  userId: string;
  isPublic: boolean;
  endpoint: string | null; // The endpoint where the script can be accessed
  callbackUrl: string | null; // URL where the script will send data back
  lastExecuted: Date | null;
  executionCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

class Script extends Model<ScriptAttributes> implements ScriptAttributes {
  public id!: string;
  public name!: string;
  public content!: string;
  public type!: 'callback' | 'exfiltration' | 'command' | 'custom';
  public description!: string | null;
  public userId!: string;
  public isPublic!: boolean;
  public endpoint!: string | null;
  public callbackUrl!: string | null;
  public lastExecuted!: Date | null;
  public executionCount!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Define associations
  public static associations: {
    creator: Association<Script, User>;
    payloads: Association<Script, Payload>;
  };
}

Script.init(
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
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('callback', 'exfiltration', 'command', 'custom'),
      allowNull: false,
      defaultValue: 'callback',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    isPublic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_public',
    },
    endpoint: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    callbackUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'callback_url',
    },
    lastExecuted: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_executed',
    },
    executionCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'execution_count',
    },
  },
  {
    sequelize,
    modelName: 'Script',
    tableName: 'scripts',
    underscored: true,
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['type'],
      },
      {
        fields: ['endpoint'],
        unique: true,
        where: {
          endpoint: {
            [Op.ne]: null
          }
        }
      },
      {
        fields: ['name'],
      },
      {
        fields: ['is_public'],
      },
      {
        fields: ['createdAt'],
      },
      {
        name: 'scripts_access_pattern',
        fields: ['is_public', 'user_id']
      }
    ]
  }
);

// Define associations
Script.belongsTo(User, { foreignKey: 'user_id', as: 'creator' });

export default Script; 