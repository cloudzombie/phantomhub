"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Device extends sequelize_1.Model {
}
Device.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    ipAddress: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        validate: {
            isIP: true,
        },
    },
    firmwareVersion: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
    },
    lastCheckIn: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('online', 'offline', 'busy'),
        allowNull: false,
        defaultValue: 'offline',
    },
    connectionType: {
        type: sequelize_1.DataTypes.ENUM('network', 'usb'),
        allowNull: false,
        defaultValue: 'network',
    },
    serialPortId: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
    },
}, {
    sequelize: database_1.default,
    modelName: 'Device',
    tableName: 'devices',
});
exports.default = Device;
