/**
 * Models Index
 * 
 * Exports all models and initializes their associations
 */

import User from './User';
import Device from './Device';
import Payload from './Payload';
import Deployment from './Deployment';
import UserSettings from './UserSettings';
import Activity from './Activity';
import Command from './Command';
import Script from './Script';
import PayloadScript from './PayloadScript';

// User associations
User.hasMany(Payload, { foreignKey: 'userId', as: 'payloads' });
User.hasMany(Deployment, { foreignKey: 'userId', as: 'deployments' });
User.hasMany(Script, { foreignKey: 'userId', as: 'scripts' });

// Script associations
Payload.belongsToMany(Script, { 
  through: PayloadScript,
  foreignKey: 'payloadId',
  otherKey: 'scriptId',
  as: 'scripts'
});

Script.belongsToMany(Payload, {
  through: PayloadScript,
  foreignKey: 'scriptId',
  otherKey: 'payloadId',
  as: 'payloads'
});

// Additional associations are already defined in the individual model files

// Define model associations
User.hasMany(Device, {
  foreignKey: 'userId',
  as: 'devices',
});

User.hasMany(Activity, {
  foreignKey: 'userId',
  as: 'activities',
});

User.hasMany(Command, {
  foreignKey: 'userId',
  as: 'commands',
});

Device.hasMany(Activity, {
  foreignKey: 'deviceId',
  as: 'activities',
});

Device.hasMany(Command, {
  foreignKey: 'deviceId',
  as: 'commands',
});

export {
  User,
  Payload,
  Device,
  Deployment,
  UserSettings,
  Activity,
  Command,
  Script,
  PayloadScript,
};

export default {
  User,
  Payload,
  Device,
  Deployment,
  UserSettings,
  Activity,
  Command,
  Script,
  PayloadScript,
}; 