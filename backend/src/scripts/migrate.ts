import { Sequelize, QueryInterface } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { readdirSync } from 'fs';
import logger from '../utils/logger';

dotenv.config();

const {
  DB_NAME = 'phantomhub',
  DB_USER = 'joshuafisher',
  DB_PASSWORD = '',
  DB_HOST = 'localhost',
  DB_PORT = '5432',
} = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: parseInt(DB_PORT, 10),
  dialect: 'postgres',
  logging: (msg) => logger.debug(msg),
});

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
    const migrationsPath = path.join(__dirname, '../migrations');
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