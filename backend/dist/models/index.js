"use strict";
/**
 * Models Index
 *
 * Exports all models and initializes their associations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayloadScript = exports.Script = exports.Command = exports.Activity = exports.UserSettings = exports.Deployment = exports.Device = exports.Payload = exports.User = void 0;
const User_1 = __importDefault(require("./User"));
exports.User = User_1.default;
const Device_1 = __importDefault(require("./Device"));
exports.Device = Device_1.default;
const Payload_1 = __importDefault(require("./Payload"));
exports.Payload = Payload_1.default;
const Deployment_1 = __importDefault(require("./Deployment"));
exports.Deployment = Deployment_1.default;
const UserSettings_1 = __importDefault(require("./UserSettings"));
exports.UserSettings = UserSettings_1.default;
const Activity_1 = __importDefault(require("./Activity"));
exports.Activity = Activity_1.default;
const Command_1 = __importDefault(require("./Command"));
exports.Command = Command_1.default;
const Script_1 = __importDefault(require("./Script"));
exports.Script = Script_1.default;
const PayloadScript_1 = __importDefault(require("./PayloadScript"));
exports.PayloadScript = PayloadScript_1.default;
// User associations
User_1.default.hasMany(Payload_1.default, { foreignKey: 'userId', as: 'payloads' });
User_1.default.hasMany(Deployment_1.default, { foreignKey: 'userId', as: 'deployments' });
User_1.default.hasMany(Script_1.default, { foreignKey: 'userId', as: 'scripts' });
// Script associations
Payload_1.default.belongsToMany(Script_1.default, {
    through: PayloadScript_1.default,
    foreignKey: 'payloadId',
    otherKey: 'scriptId',
    as: 'scripts'
});
Script_1.default.belongsToMany(Payload_1.default, {
    through: PayloadScript_1.default,
    foreignKey: 'scriptId',
    otherKey: 'payloadId',
    as: 'payloads'
});
// Additional associations are already defined in the individual model files
// Define model associations
User_1.default.hasMany(Device_1.default, {
    foreignKey: 'userId',
    as: 'devices',
});
User_1.default.hasMany(Activity_1.default, {
    foreignKey: 'userId',
    as: 'activities',
});
User_1.default.hasMany(Command_1.default, {
    foreignKey: 'userId',
    as: 'commands',
});
Device_1.default.hasMany(Activity_1.default, {
    foreignKey: 'deviceId',
    as: 'activities',
});
Device_1.default.hasMany(Command_1.default, {
    foreignKey: 'deviceId',
    as: 'commands',
});
exports.default = {
    User: User_1.default,
    Payload: Payload_1.default,
    Device: Device_1.default,
    Deployment: Deployment_1.default,
    UserSettings: UserSettings_1.default,
    Activity: Activity_1.default,
    Command: Command_1.default,
    Script: Script_1.default,
    PayloadScript: PayloadScript_1.default,
};
