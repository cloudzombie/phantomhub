"use strict";
/**
 * User Model
 *
 * Represents a user in the system
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class User extends sequelize_1.Model {
    // Instance method to compare password
    async comparePassword(candidatePassword) {
        return bcryptjs_1.default.compare(candidatePassword, this.password);
    }
    // Instance method to check password history
    async isPasswordReused(newPassword) {
        if (!this.passwordHistory)
            return false;
        for (const oldHash of this.passwordHistory) {
            if (await bcryptjs_1.default.compare(newPassword, oldHash)) {
                return true;
            }
        }
        return false;
    }
    // Instance method to update password
    async updatePassword(newPassword) {
        const salt = await bcryptjs_1.default.genSalt(10);
        const hash = await bcryptjs_1.default.hash(newPassword, salt);
        // Keep last 5 passwords in history
        const history = this.passwordHistory || [];
        history.unshift(this.password);
        if (history.length > 5)
            history.pop();
        this.password = hash;
        this.passwordHistory = history;
        this.passwordLastChanged = new Date();
        this.requirePasswordChange = false;
        await this.save();
    }
    // Instance method to handle failed login
    async handleFailedLogin() {
        this.failedLoginAttempts += 1;
        this.lastFailedLogin = new Date();
        // Lock account after 5 failed attempts
        if (this.failedLoginAttempts >= 5) {
            this.isActive = false;
        }
        await this.save();
    }
    // Instance method to reset failed login attempts
    async resetFailedLogins() {
        this.failedLoginAttempts = 0;
        this.lastFailedLogin = null;
        await this.save();
    }
}
User.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    password: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: sequelize_1.DataTypes.ENUM('admin', 'operator', 'user'),
        allowNull: false,
        defaultValue: 'user',
    },
    lastLogin: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    failedLoginAttempts: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    lastFailedLogin: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    passwordLastChanged: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    passwordHistory: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING),
        allowNull: true,
    },
    mfaEnabled: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    mfaSecret: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    sessionTimeout: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3600, // 1 hour in seconds
    },
    requirePasswordChange: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    sequelize: database_1.sequelize,
    modelName: 'User',
    tableName: 'users',
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcryptjs_1.default.genSalt(10);
                user.password = await bcryptjs_1.default.hash(user.password, salt);
                user.passwordLastChanged = new Date();
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcryptjs_1.default.genSalt(10);
                user.password = await bcryptjs_1.default.hash(user.password, salt);
                user.passwordLastChanged = new Date();
            }
        },
    },
});
exports.default = User;
