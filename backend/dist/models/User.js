"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRole = exports.User = void 0;
const sequelize_1 = require("sequelize");
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = __importDefault(require("../config/database"));
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "Administrator";
    UserRole["OPERATOR"] = "Operator";
    UserRole["VIEWER"] = "Viewer";
})(UserRole || (exports.UserRole = UserRole = {}));
class User extends sequelize_1.Model {
    async comparePassword(password) {
        return bcrypt_1.default.compare(password, this.password);
    }
}
exports.User = User;
User.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    username: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        unique: true,
    },
    email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    password: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    role: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(UserRole)),
        allowNull: false,
        defaultValue: UserRole.VIEWER,
    },
    lastLogin: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize: database_1.default,
    modelName: 'User',
    tableName: 'users',
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt_1.default.genSalt(10);
                user.password = await bcrypt_1.default.hash(user.password, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt_1.default.genSalt(10);
                user.password = await bcrypt_1.default.hash(user.password, salt);
            }
        },
    },
});
exports.default = User;
