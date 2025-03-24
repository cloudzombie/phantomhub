"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deployment = exports.Payload = exports.Device = exports.User = void 0;
const User_1 = __importDefault(require("./User"));
exports.User = User_1.default;
const Device_1 = __importDefault(require("./Device"));
exports.Device = Device_1.default;
const Payload_1 = __importDefault(require("./Payload"));
exports.Payload = Payload_1.default;
const Deployment_1 = __importDefault(require("./Deployment"));
exports.Deployment = Deployment_1.default;
// User associations
User_1.default.hasMany(Payload_1.default, { foreignKey: 'userId', as: 'payloads' });
User_1.default.hasMany(Deployment_1.default, { foreignKey: 'userId', as: 'deployments' });
