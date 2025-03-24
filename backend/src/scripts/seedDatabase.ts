import bcrypt from 'bcryptjs';
import { connectDB } from '../config/database';
import { User, UserRole } from '../models/User';
import Device from '../models/Device';
import Payload from '../models/Payload';
import Deployment from '../models/Deployment';

async function seedDatabase() {
  try {
    // Connect to database
    await connectDB();
    console.log('Database connected for seeding');

    // Sync models with database
    await User.sync({ alter: true });
    await Device.sync({ alter: true });
    await Payload.sync({ alter: true });
    await Deployment.sync({ alter: true });

    // Create admin user
    const adminPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const adminUser = await User.findOrCreate({
      where: { email: 'admin@phantomhub.com' },
      defaults: {
        username: 'admin',
        email: 'admin@phantomhub.com',
        password: hashedPassword,
        role: UserRole.ADMIN,
      }
    });
    
    console.log(`Admin user ${adminUser[0].username} created or already exists`);

    // Create operator user
    const operatorPassword = 'operator123';
    const hashedOperatorPassword = await bcrypt.hash(operatorPassword, 10);
    
    const operatorUser = await User.findOrCreate({
      where: { email: 'operator@phantomhub.com' },
      defaults: {
        username: 'operator',
        email: 'operator@phantomhub.com',
        password: hashedOperatorPassword,
        role: UserRole.OPERATOR,
      }
    });
    
    console.log(`Operator user ${operatorUser[0].username} created or already exists`);

    // Create viewer user
    const viewerPassword = 'viewer123';
    const hashedViewerPassword = await bcrypt.hash(viewerPassword, 10);
    
    const viewerUser = await User.findOrCreate({
      where: { email: 'viewer@phantomhub.com' },
      defaults: {
        username: 'viewer',
        email: 'viewer@phantomhub.com',
        password: hashedViewerPassword,
        role: UserRole.VIEWER,
      }
    });
    
    console.log(`Viewer user ${viewerUser[0].username} created or already exists`);

    console.log('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase(); 