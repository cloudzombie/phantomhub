"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const Payload_1 = __importDefault(require("../models/Payload"));
const User_1 = __importDefault(require("../models/User"));
async function createPayload() {
    try {
        // Connect to database
        await (0, database_1.connectDB)();
        console.log('Database connected for creating payload');
        // Find the admin user
        const adminUser = await User_1.default.findOne({
            where: { email: 'admin@phantomhub.com' }
        });
        if (!adminUser) {
            console.error('Admin user not found. Please run the seedDatabase script first.');
            process.exit(1);
        }
        // Sample DuckyScript payload
        const duckyscript = `REM This is a sample DuckyScript payload
DELAY 1000
STRING Hello, World!
ENTER
DELAY 500
STRING This is a test from PHANTOM HUB
ENTER`;
        // Create a sample payload
        const [payload, created] = await Payload_1.default.findOrCreate({
            where: { name: 'Hello World Example' },
            defaults: {
                name: 'Hello World Example',
                script: duckyscript,
                description: 'A simple payload that types "Hello, World!" and a message',
                userId: adminUser.id
            }
        });
        if (created) {
            console.log(`Payload "${payload.name}" created successfully with id ${payload.id}`);
        }
        else {
            console.log(`Payload "${payload.name}" already exists with id ${payload.id}`);
            // Update the script to ensure it's current
            await payload.update({ script: duckyscript });
            console.log('Payload script updated');
        }
        process.exit(0);
    }
    catch (error) {
        console.error('Error creating payload:', error);
        process.exit(1);
    }
}
// Run the function
createPayload();
