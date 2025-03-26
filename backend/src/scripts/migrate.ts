import { Sequelize, QueryInterface } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { readdirSync } from 'fs';
import logger from '../utils/logger';

dotenv.config();

// Use DATABASE_URL if available (for Heroku)
const sequelize = process.env.DATABASE_URL 
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      protocol: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: (msg) => logger.debug(msg)
    })
  : new Sequelize(
      process.env.DB_NAME || 'phantomhub',
      process.env.DB_USER || 'joshuafisher',
      process.env.DB_PASSWORD || '',
      {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        dialect: 'postgres',
        logging: (msg) => logger.debug(msg),
      }
    );

async function getCompletedMigrations(queryInterface: QueryInterface): Promise<string[]> {
  try {
    // Create SequelizeMeta table if it doesn't exist
    await queryInterface.createTable('SequelizeMeta', {
      name: {
        type: 'STRING',
        allowNull: false,
        unique: true,
        primaryKey: true
      }
    }, { charset: 'utf8' });

    const [results] = await sequelize.query('SELECT name FROM "SequelizeMeta"');
    return (results as any[]).map(r => r.name);
  } catch (error) {
    // If table doesn't exist, return empty array
    return [];
  }
}

async function markMigrationComplete(queryInterface: QueryInterface, filename: string): Promise<void> {
  await queryInterface.bulkInsert('SequelizeMeta', [{
    name: filename
  }]);
}

async function runMigrations(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    const queryInterface = sequelize.getQueryInterface();
    const completedMigrations = await getCompletedMigrations(queryInterface);

    try {
      // Load the consolidated migrations file
      const migrationsPath = process.env.NODE_ENV === 'production'
        ? path.join(__dirname, '../migrations/index.js')
        : path.join(__dirname, '../../src/migrations/index.js');

      logger.info(`Loading migrations from: ${migrationsPath}`);
      const { migrations } = require(migrationsPath);

      // Run each migration in sequence
      for (const migration of migrations) {
        if (!completedMigrations.includes(migration.name)) {
          logger.info(`Running migration: ${migration.name}`);
          try {
            await migration.up(queryInterface);
            await markMigrationComplete(queryInterface, migration.name);
            logger.info(`Completed migration: ${migration.name}`);
          } catch (error) {
            logger.error(`Error running migration ${migration.name}:`, error);
            throw error;
          }
        } else {
          logger.debug(`Skipping completed migration: ${migration.name}`);
        }
      }
    } catch (error) {
      logger.error('Error running migrations:', error);
      throw error;
    }

    logger.info('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations(); 