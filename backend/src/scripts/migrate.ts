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
    const migrationsPath = path.join(__dirname, '../../src/migrations');
    const migrationFiles = readdirSync(migrationsPath)
      .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
      .sort();

    const completedMigrations = await getCompletedMigrations(queryInterface);

    for (const file of migrationFiles) {
      if (!completedMigrations.includes(file)) {
        logger.info(`Running migration: ${file}`);
        const migration = require(path.join(migrationsPath, file));
        await migration.up(queryInterface);
        await markMigrationComplete(queryInterface, file);
        logger.info(`Completed migration: ${file}`);
      } else {
        logger.debug(`Skipping completed migration: ${file}`);
      }
    }

    logger.info('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations(); 