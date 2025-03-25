import bcrypt from 'bcryptjs';
import { initializeDatabase } from '../config/database';
import User from '../models/User';
import Device from '../models/Device';
import Payload from '../models/Payload';
import Deployment from '../models/Deployment';

async function seedDatabase() {
  try {
    // Initialize database
    await initializeDatabase();
    console.log('Database connected for seeding');

    // Create admin user
    const adminPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const [admin] = await User.findOrCreate({
      where: { email: 'admin@phantomhub.com' },
      defaults: {
        name: 'Admin User',
        email: 'admin@phantomhub.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        failedLoginAttempts: 0,
        mfaEnabled: false,
        sessionTimeout: 3600,
        requirePasswordChange: false
      }
    });
    
    console.log(`Admin user ${admin.name} created or already exists`);

    // Create operator user
    const operatorPassword = 'operator123';
    const hashedOperatorPassword = await bcrypt.hash(operatorPassword, 10);
    
    const [operator] = await User.findOrCreate({
      where: { email: 'operator@phantomhub.com' },
      defaults: {
        name: 'Operator User',
        email: 'operator@phantomhub.com',
        password: hashedOperatorPassword,
        role: 'user',
        isActive: true,
        failedLoginAttempts: 0,
        mfaEnabled: false,
        sessionTimeout: 3600,
        requirePasswordChange: true
      }
    });
    
    console.log(`Operator user ${operator.name} created or already exists`);

    // Create viewer user
    const viewerPassword = 'viewer123';
    const hashedViewerPassword = await bcrypt.hash(viewerPassword, 10);
    
    const [viewer] = await User.findOrCreate({
      where: { email: 'viewer@phantomhub.com' },
      defaults: {
        name: 'Viewer User',
        email: 'viewer@phantomhub.com',
        password: hashedViewerPassword,
        role: 'user',
        isActive: true,
        failedLoginAttempts: 0,
        mfaEnabled: false,
        sessionTimeout: 3600,
        requirePasswordChange: true
      }
    });
    
    console.log(`Viewer user ${viewer.name} created or already exists`);

    console.log('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase(); 