"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../utils/logger"));
dotenv_1.default.config();
// Use DATABASE_URL if available (for Heroku)
const sequelize = process.env.DATABASE_URL
    ? new sequelize_1.Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        protocol: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: (msg) => logger_1.default.debug(msg)
    })
    : new sequelize_1.Sequelize(process.env.DB_NAME || 'phantomhub', process.env.DB_USER || 'joshuafisher', process.env.DB_PASSWORD || '', {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        dialect: 'postgres',
        logging: (msg) => logger_1.default.debug(msg),
    });
async function getCompletedMigrations(queryInterface) {
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
        return results.map(r => r.name);
    }
    catch (error) {
        // If table doesn't exist, return empty array
        return [];
    }
}
async function markMigrationComplete(queryInterface, filename) {
    await queryInterface.bulkInsert('SequelizeMeta', [{
            name: filename
        }]);
}
async function runMigrations() {
    try {
        await sequelize.authenticate();
        logger_1.default.info('Database connection established successfully');
        const queryInterface = sequelize.getQueryInterface();
        const completedMigrations = await getCompletedMigrations(queryInterface);
        try {
            // Load the consolidated migrations file
            const migrationsPath = process.env.NODE_ENV === 'production'
                ? path_1.default.join(__dirname, '../migrations/index.js')
                : path_1.default.join(__dirname, '../../src/migrations/index.js');
            logger_1.default.info(`Loading migrations from: ${migrationsPath}`);
            const { migrations } = require(migrationsPath);
            // Run each migration in sequence
            for (const migration of migrations) {
                if (!completedMigrations.includes(migration.name)) {
                    logger_1.default.info(`Running migration: ${migration.name}`);
                    try {
                        await migration.up(queryInterface);
                        await markMigrationComplete(queryInterface, migration.name);
                        logger_1.default.info(`Completed migration: ${migration.name}`);
                    }
                    catch (error) {
                        logger_1.default.error(`Error running migration ${migration.name}:`, error);
                        throw error;
                    }
                }
                else {
                    logger_1.default.debug(`Skipping completed migration: ${migration.name}`);
                }
            }
        }
        catch (error) {
            logger_1.default.error('Error running migrations:', error);
            throw error;
        }
        logger_1.default.info('All migrations completed successfully');
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error('Migration failed:', error);
        process.exit(1);
    }
}
runMigrations();
