import User from './User';
import Device from './Device';
import Payload from './Payload';
import Deployment from './Deployment';

// User associations
User.hasMany(Payload, { foreignKey: 'userId', as: 'payloads' });
User.hasMany(Deployment, { foreignKey: 'userId', as: 'deployments' });

// Additional associations are already defined in the individual model files

export { User, Device, Payload, Deployment }; 