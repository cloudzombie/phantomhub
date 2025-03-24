"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const Device_1 = __importDefault(require("../models/Device"));
async function createDevice() {
    try {
        // Connect to database
        await (0, database_1.connectDB)();
        console.log('Database connected for creating device');
        // Create a test device
        const [device, created] = await Device_1.default.findOrCreate({
            where: { ipAddress: '192.168.1.100' },
            defaults: {
                name: 'Test O.MG Cable',
                ipAddress: '192.168.1.100',
                firmwareVersion: '1.2.0',
                status: 'online'
            }
        });
        if (created) {
            console.log(`Device "${device.name}" created successfully with id ${device.id}`);
        }
        else {
            console.log(`Device "${device.name}" already exists with id ${device.id}`);
            // Update status to online
            await device.update({ status: 'online' });
            console.log(`Device status updated to ${device.status}`);
        }
        process.exit(0);
    }
    catch (error) {
        console.error('Error creating device:', error);
        process.exit(1);
    }
}
// Run the function
createDevice();
