import { initializeDatabase } from '../config/database';
import Device from '../models/Device';
import User from '../models/User';

async function createDevice() {
  try {
    // Initialize database
    await initializeDatabase();
    console.log('Database connected for creating device');

    // Find admin user
    const admin = await User.findOne({
      where: { email: 'admin@phantomhub.com' }
    });

    if (!admin) {
      console.error('Admin user not found. Please run the seedDatabase script first.');
      process.exit(1);
    }

    // Create a test device
    const [device, created] = await Device.findOrCreate({
      where: { name: 'Test O.MG Cable' },
      defaults: {
        name: 'Test O.MG Cable',
        userId: admin.id,
        ipAddress: '192.168.1.100',
        firmwareVersion: '1.2.0',
        status: 'online',
        connectionType: 'network'
      }
    });

    if (created) {
      console.log(`Device "${device.name}" created successfully with id ${device.id}`);
    } else {
      console.log(`Device "${device.name}" already exists with id ${device.id}`);
      
      // Update status to online
      await device.update({ status: 'online' });
      console.log(`Device status updated to ${device.status}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating device:', error);
    process.exit(1);
  }
}

// Run the function
createDevice(); 