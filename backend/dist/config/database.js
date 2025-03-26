"use strict";
/**
 * Database Configuration
 *
 * Enterprise-grade database configuration with connection pooling,
 * SSL support, retries, and comprehensive error handling
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = exports.closeDatabase = exports.initializeDatabase = void 0;
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("../utils/logger"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
// Parse DATABASE_URL for Heroku deployment
const parseDbUrl = () => {
    if (process.env.DATABASE_URL) {
        try {
            // Parse Heroku's DATABASE_URL
            const dbUrl = new URL(process.env.DATABASE_URL);
            return {
                DB_NAME: dbUrl.pathname.substring(1),
                DB_USER: dbUrl.username,
                DB_PASSWORD: dbUrl.password,
                DB_HOST: dbUrl.hostname,
                DB_PORT: dbUrl.port,
                DB_SSL: 'true',
                NODE_ENV: process.env.NODE_ENV,
                DB_SSL_CA: process.env.DB_SSL_CA,
                DB_POOL_MAX: process.env.DB_POOL_MAX,
                DB_POOL_MIN: process.env.DB_POOL_MIN,
                DB_POOL_ACQUIRE: process.env.DB_POOL_ACQUIRE,
                DB_POOL_IDLE: process.env.DB_POOL_IDLE,
                DB_RETRY_ATTEMPTS: process.env.DB_RETRY_ATTEMPTS,
                DB_RETRY_DELAY: process.env.DB_RETRY_DELAY
            };
        }
        catch (error) {
            logger_1.default.error('Error parsing DATABASE_URL:', error);
        }
    }
    return {};
};
// Merge environment variables with parsed DATABASE_URL
const dbEnv = {
    DB_NAME: 'phantomhub',
    DB_USER: 'joshuafisher',
    DB_PASSWORD: '',
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_SSL: 'false',
    NODE_ENV: 'development',
    DB_SSL_CA: '',
    DB_POOL_MAX: '10',
    DB_POOL_MIN: '2',
    DB_POOL_ACQUIRE: '30000',
    DB_POOL_IDLE: '10000',
    DB_RETRY_ATTEMPTS: '5',
    DB_RETRY_DELAY: '5000',
    ...parseDbUrl(),
    ...process.env
};
const { DB_NAME = 'phantomhub', DB_USER = 'joshuafisher', DB_PASSWORD = '', DB_HOST = 'localhost', DB_PORT = '5432', NODE_ENV = 'development', DB_SSL = 'false', DB_SSL_CA = '', DB_POOL_MAX = '10', DB_POOL_MIN = '2', DB_POOL_ACQUIRE = '30000', DB_POOL_IDLE = '10000', DB_RETRY_ATTEMPTS = '5', DB_RETRY_DELAY = '5000' } = dbEnv;
// SSL configuration for production
const getSslConfig = () => {
    if (DB_SSL === 'true' && NODE_ENV === 'production') {
        return {
            ssl: {
                require: true,
                rejectUnauthorized: true,
                ca: DB_SSL_CA ? fs_1.default.readFileSync(DB_SSL_CA).toString() : undefined
            }
        };
    }
    return {};
};
// Database configuration
const dbConfig = {
    host: DB_HOST,
    port: parseInt(DB_PORT, 10),
    dialect: 'postgres',
    logging: NODE_ENV === 'development' ? (msg) => logger_1.default.debug(msg) : false,
    pool: {
        max: parseInt(DB_POOL_MAX, 10),
        min: parseInt(DB_POOL_MIN, 10),
        acquire: parseInt(DB_POOL_ACQUIRE, 10),
        idle: parseInt(DB_POOL_IDLE, 10)
    },
    retry: {
        max: parseInt(DB_RETRY_ATTEMPTS, 10),
        backoffBase: parseInt(DB_RETRY_DELAY, 10)
    },
    dialectOptions: {
        ...getSslConfig(),
        connectTimeout: 60000 // 1 minute connection timeout
    },
    benchmark: NODE_ENV === 'development',
    logQueryParameters: NODE_ENV === 'development'
};
// Create Sequelize instance
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
        logging: NODE_ENV === 'development' ? (msg) => logger_1.default.debug(msg) : false
    })
    : new sequelize_1.Sequelize(DB_NAME, DB_USER, DB_PASSWORD, dbConfig);
exports.sequelize = sequelize;
// Function to initialize database with retries
const initializeDatabase = async () => {
    let retryCount = 0;
    const maxRetries = parseInt(DB_RETRY_ATTEMPTS, 10);
    const retryDelay = parseInt(DB_RETRY_DELAY, 10);
    while (retryCount < maxRetries) {
        try {
            await sequelize.authenticate();
            logger_1.default.info('Database connection established successfully');
            // Check if database exists, if not create it (development only)
            if (NODE_ENV === 'development') {
                try {
                    await sequelize.query(`CREATE DATABASE ${DB_NAME};`);
                }
                catch (error) {
                    // Ignore if database already exists
                    if (!(error instanceof Error) || !error.message.includes('already exists')) {
                        logger_1.default.warn('Database creation error (might already exist):', error);
                    }
                }
            }
            // Run migrations if in development
            if (NODE_ENV === 'development') {
                await sequelize.sync({ alter: false }); // Never use force: true in production
                logger_1.default.info('Database synchronized successfully');
            }
            return;
        }
        catch (error) {
            retryCount++;
            logger_1.default.error(`Database connection attempt ${retryCount} failed:`, error);
            if (retryCount === maxRetries) {
                logger_1.default.error('Maximum database connection retry attempts reached');
                throw new Error('Failed to establish database connection after maximum retries');
            }
            logger_1.default.info(`Retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
};
exports.initializeDatabase = initializeDatabase;
// Function to gracefully close database connection
const closeDatabase = async () => {
    try {
        await sequelize.close();
        logger_1.default.info('Database connection closed successfully');
    }
    catch (error) {
        logger_1.default.error('Error closing database connection:', error);
        throw error;
    }
};
exports.closeDatabase = closeDatabase;
