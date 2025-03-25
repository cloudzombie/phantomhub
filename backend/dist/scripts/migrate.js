"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const logger_1 = __importDefault(require("../utils/logger"));
dotenv_1.default.config();
const { DB_NAME = 'phantomhub', DB_USER = 'joshuafisher', DB_PASSWORD = '', DB_HOST = 'localhost', DB_PORT = '5432', } = process.env;
const sequelize = new sequelize_1.Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: parseInt(DB_PORT, 10),
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
        const migrationsPath = path_1.default.join(__dirname, '../migrations');
        const migrationFiles = (0, fs_1.readdirSync)(migrationsPath)
            .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
            .sort();
        const completedMigrations = await getCompletedMigrations(queryInterface);
        for (const file of migrationFiles) {
            if (!completedMigrations.includes(file)) {
                logger_1.default.info(`Running migration: ${file}`);
                const migration = require(path_1.default.join(migrationsPath, file));
                await migration.up(queryInterface);
                await markMigrationComplete(queryInterface, file);
                logger_1.default.info(`Completed migration: ${file}`);
            }
            else {
                logger_1.default.debug(`Skipping completed migration: ${file}`);
            }
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
