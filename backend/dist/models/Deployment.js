"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const Payload_1 = __importDefault(require("./Payload"));
const Device_1 = __importDefault(require("./Device"));
const User_1 = __importDefault(require("./User"));
class Deployment extends sequelize_1.Model {
}
Deployment.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    payloadId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: Payload_1.default,
            key: 'id',
        },
        field: 'payload_id',
    },
    deviceId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: Device_1.default,
            key: 'id',
        },
        field: 'device_id',
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: User_1.default,
            key: 'id',
        },
        field: 'user_id',
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'connected', 'executing', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
    },
    result: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
}, {
    sequelize: database_1.sequelize,
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
});
// Define associations
Deployment.belongsTo(Payload_1.default, { foreignKey: 'payload_id', as: 'payload' });
Deployment.belongsTo(Device_1.default, { foreignKey: 'device_id', as: 'device' });
Deployment.belongsTo(User_1.default, { foreignKey: 'user_id', as: 'initiator' });
exports.default = Deployment;
