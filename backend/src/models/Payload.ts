import { Model, DataTypes, Association } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';

export interface PayloadAttributes {
  id?: string;
  name: string;
  script: string;
  description: string | null;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class Payload extends Model<PayloadAttributes> implements PayloadAttributes {
  public id!: string;
  public name!: string;
  public script!: string;
  public description!: string | null;
  public userId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Define associations
  public static associations: {
    creator: Association<Payload, User>;
  };
}

Payload.init(
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
    script: {
      type: DataTypes.TEXT,
      allowNull: false,
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
    },
  },
  {
    sequelize,
    modelName: 'Payload',
    tableName: 'payloads'
  }
);

// Define associations
Payload.belongsTo(User, { foreignKey: 'userId', as: 'creator' });

export default Payload; 