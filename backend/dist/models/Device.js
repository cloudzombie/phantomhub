"use strict";
/**
 * Device Model
 *
 * Represents an O.MG Cable device in the system
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const User_1 = __importDefault(require("./User"));
class Device extends sequelize_1.Model {
}
Device.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
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
        type: sequelize_1.DataTypes.ENUM('online', 'offline', 'error', 'maintenance'),
        allowNull: false,
        defaultValue: 'offline',
    },
    connectionType: {
        type: sequelize_1.DataTypes.ENUM('usb', 'network'),
        allowNull: false,
        field: 'connection_type',
    },
    ipAddress: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        validate: {
            isIP: true,
        },
        field: 'ip_address',
    },
    serialPortId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'serial_port_id',
    },
    firmwareVersion: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'firmware_version',
    },
    lastSeen: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: 'last_seen',
    },
    batteryLevel: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 0,
            max: 100,
        },
        field: 'battery_level',
    },
    signalStrength: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 0,
            max: 100,
        },
        field: 'signal_strength',
    },
    errors: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
    },
}, {
    sequelize: database_1.sequelize,
    modelName: 'Device',
    tableName: 'devices',
    underscored: true,
    indexes: [
        {
            fields: ['user_id'],
        },
        {
            fields: ['status'],
        },
    ],
});
// Define associations
Device.belongsTo(User_1.default, {
    foreignKey: 'user_id',
    as: 'owner',
});
exports.default = Device;
