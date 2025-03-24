"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const database_2 = __importDefault(require("../config/database"));
async function runMigrations() {
    try {
        // Connect to database
        await (0, database_1.connectDB)();
        console.log('Database connected');
        // Force sync all models (recreate tables)
        await database_2.default.sync({ force: true });
        console.log('Database tables dropped and recreated');
        console.log('Migrations completed successfully');
        process.exit(0);
    }
    catch (error) {
        console.error('Error running migrations:', error);
        process.exit(1);
    }
}
runMigrations();
