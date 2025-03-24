import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

interface PayloadAttributes {
  id: number;
  name: string;
  script: string;
  description: string | null;
  userId: number;
}

interface PayloadCreationAttributes {
  name: string;
  script: string;
  description?: string;
  userId: number;
}

class Payload extends Model<PayloadAttributes, PayloadCreationAttributes> implements PayloadAttributes {
  public id!: number;
  public name!: string;
  public script!: string;
  public description!: string | null;
  public userId!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Payload.init(
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
    script: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
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
    modelName: 'Payload',
    tableName: 'payloads',
  }
);

// Define associations
Payload.belongsTo(User, { foreignKey: 'userId', as: 'creator' });

export default Payload; 