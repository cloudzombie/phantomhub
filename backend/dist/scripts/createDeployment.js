"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const Deployment_1 = __importDefault(require("../models/Deployment"));
const Payload_1 = __importDefault(require("../models/Payload"));
const Device_1 = __importDefault(require("../models/Device"));
const User_1 = __importDefault(require("../models/User"));
async function createDeployment() {
    try {
        // Connect to database
        await (0, database_1.connectDB)();
        console.log('Database connected for creating deployment');
        // Find the admin user
        const adminUser = await User_1.default.findOne({
            where: { email: 'admin@phantomhub.com' }
        });
        if (!adminUser) {
            console.error('Admin user not found. Please run the seedDatabase script first.');
            process.exit(1);
        }
        // Find the sample payload
        const payload = await Payload_1.default.findOne({
            where: { name: 'Hello World Example' }
        });
        if (!payload) {
            console.error('Sample payload not found. Please run the createPayload script first.');
            process.exit(1);
        }
        // Find the test device
        const device = await Device_1.default.findOne({
            where: { name: 'Test O.MG Cable' }
        });
        if (!device) {
            console.error('Test device not found. Please run the createDevice script first.');
            process.exit(1);
        }
        // Create a sample deployment in two steps:
        // 1. First create with the required fields
        const [deployment, created] = await Deployment_1.default.findOrCreate({
            where: {
                payloadId: payload.id,
                deviceId: device.id,
                userId: adminUser.id,
                status: 'completed'
            },
            defaults: {
                payloadId: payload.id,
                deviceId: device.id,
                userId: adminUser.id,
                status: 'completed'
            }
        });
        // 2. Then update with the result
        const result = JSON.stringify({
            success: true,
            executionTime: 2340,
            output: "Successfully executed Hello World payload",
            timestamp: new Date()
        });
        await deployment.update({ result });
        if (created) {
            console.log(`Deployment created successfully with id ${deployment.id}`);
        }
        else {
            console.log(`Deployment already exists with id ${deployment.id}`);
            console.log('Deployment result updated');
        }
        process.exit(0);
    }
    catch (error) {
        console.error('Error creating deployment:', error);
        process.exit(1);
    }
}
// Run the function
createDeployment();
