"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const User_1 = __importDefault(require("../models/User"));
const Payload_1 = __importDefault(require("../models/Payload"));
const Device_1 = __importDefault(require("../models/Device"));
const Deployment_1 = __importDefault(require("../models/Deployment"));
async function createDeployment() {
    try {
        // Initialize database connection
        await (0, database_1.initializeDatabase)();
        // Find admin user
        const admin = await User_1.default.findOne({
            where: { email: 'admin@phantomhub.com' }
        });
        if (!admin) {
            console.error('Admin user not found');
            process.exit(1);
        }
        // Find sample payload
        const payload = await Payload_1.default.findOne({
            where: { name: 'Hello World Example' }
        });
        if (!payload) {
            console.error('Sample payload not found');
            process.exit(1);
        }
        // Find test device
        const device = await Device_1.default.findOne({
            where: { name: 'Test O.MG Cable' }
        });
        if (!device) {
            console.error('Test device not found');
            process.exit(1);
        }
        // Create deployment
        const [deployment, created] = await Deployment_1.default.findOrCreate({
            where: {
                userId: admin.id,
                payloadId: payload.id,
                deviceId: device.id
            },
            defaults: {
                userId: admin.id,
                payloadId: payload.id,
                deviceId: device.id,
                status: 'pending'
            }
        });
        if (created) {
            console.log('Deployment created successfully');
        }
        else {
            deployment.status = 'pending';
            await deployment.save();
            console.log('Deployment updated successfully');
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
