import User from './User';
import Device from './Device';
import Payload from './Payload';
import Deployment from './Deployment';
import UserSettings from './UserSettings';

// User associations
User.hasMany(Payload, { foreignKey: 'userId', as: 'payloads' });
User.hasMany(Deployment, { foreignKey: 'userId', as: 'deployments' });

// Additional associations are already defined in the individual model files

export {
  User,
  Payload,
  Device,
  Deployment,
  UserSettings
};

export default {
  User,
  Payload,
  Device,
  Deployment,
  UserSettings
}; 