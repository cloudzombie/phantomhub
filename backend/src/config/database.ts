import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

dotenv.config();

// Database configuration
const DB_NAME = process.env.DB_NAME || 'postgres';
const TARGET_DB_NAME = 'phantomhub';
const DB_USER = process.env.DB_USER || 'joshuafisher';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_DIALECT = 'postgres';

// Create Sequelize instance
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: DB_DIALECT,
  logging: process.env.NODE_ENV !== 'production',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Function to connect to the database
export const connectDB = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Check if the phantomhub database exists, and create it if it doesn't
    try {
      const [results] = await sequelize.query(
        `SELECT 1 FROM pg_database WHERE datname = '${TARGET_DB_NAME}'`
      );
      
      if ((results as any[]).length === 0) {
        console.log(`Database ${TARGET_DB_NAME} does not exist. Creating...`);
        await sequelize.query(`CREATE DATABASE ${TARGET_DB_NAME}`);
        console.log(`Database ${TARGET_DB_NAME} created successfully.`);
        
        // Connect to the new database
        await sequelize.close();
        const newSequelize = new Sequelize(TARGET_DB_NAME, DB_USER, DB_PASSWORD, {
          host: DB_HOST,
          port: DB_PORT,
          dialect: DB_DIALECT,
          logging: process.env.NODE_ENV !== 'production',
          pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
          }
        });
        
        // Replace the old sequelize instance with the new one
        Object.assign(sequelize, newSequelize);
      } else {
        console.log(`Database ${TARGET_DB_NAME} already exists.`);
      }
    } catch (error) {
      console.error('Error checking/creating database:', error);
      throw error;
    }
    
    // Sync all models with database
    if (process.env.NODE_ENV === 'development') {
      // In development, you might want to use { force: true } to recreate tables
      await sequelize.sync({ alter: true });
      console.log('Database synced');
    }
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

export default sequelize; 