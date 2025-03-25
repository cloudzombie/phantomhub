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
    },
    deviceId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: Device_1.default,
            key: 'id',
        },
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: User_1.default,
            key: 'id',
        },
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
    tableName: 'deployments'
});
// Define associations
Deployment.belongsTo(Payload_1.default, { foreignKey: 'payloadId', as: 'payload' });
Deployment.belongsTo(Device_1.default, { foreignKey: 'deviceId', as: 'device' });
Deployment.belongsTo(User_1.default, { foreignKey: 'userId', as: 'initiator' });
exports.default = Deployment;
