import { initializeDatabase } from '../config/database';
import User from '../models/User';
import Payload from '../models/Payload';
import Device from '../models/Device';
import Deployment from '../models/Deployment';

async function createDeployment() {
  try {
    // Initialize database connection
    await initializeDatabase();

    // Find admin user
    const admin = await User.findOne({
      where: { email: 'admin@phantomhub.com' }
    });

    if (!admin) {
      console.error('Admin user not found');
      process.exit(1);
    }

    // Find sample payload
    const payload = await Payload.findOne({
      where: { name: 'Hello World Example' }
    });

    if (!payload) {
      console.error('Sample payload not found');
      process.exit(1);
    }

    // Find test device
    const device = await Device.findOne({
      where: { name: 'Test O.MG Cable' }
    });

    if (!device) {
      console.error('Test device not found');
      process.exit(1);
    }

    // Create deployment
    const [deployment, created] = await Deployment.findOrCreate({
      where: {
        userId: admin.id,
        payloadId: payload.id,
        deviceId: device.id
      },
      defaults: {
        userId: admin.id,
        payloadId: payload.id,
        deviceId: device.id,
        status: 'pending'
      }
    });

    if (created) {
      console.log('Deployment created successfully');
    } else {
      deployment.status = 'pending';
      await deployment.save();
      console.log('Deployment updated successfully');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating deployment:', error);
    process.exit(1);
  }
}

// Run the function
createDeployment(); 