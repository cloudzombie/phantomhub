import { connectDB } from '../config/database';
import sequelize from '../config/database';
import { User } from '../models/User';
import Device from '../models/Device';

async function runMigrations() {
  try {
    // Connect to database
    await connectDB();
    console.log('Database connected');

    // Force sync all models (recreate tables)
    await sequelize.sync({ force: true });
    console.log('Database tables dropped and recreated');

    console.log('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations(); 