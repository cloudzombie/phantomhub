"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const User_1 = require("../models/User");
const Device_1 = __importDefault(require("../models/Device"));
async function seedDatabase() {
    try {
        // Connect to database
        await (0, database_1.connectDB)();
        console.log('Database connected');
        // Check if admin user exists
        const adminExists = await User_1.User.findOne({
            where: {
                email: 'admin@phantomhub.com'
            }
        });
        if (!adminExists) {
            // Create admin user
            await User_1.User.create({
                username: 'admin',
                email: 'admin@phantomhub.com',
                password: 'admin123',
                role: User_1.UserRole.ADMIN
            });
            console.log('Admin user created');
        }
        else {
            console.log('Admin user already exists');
        }
        // Create operator user
        const operatorExists = await User_1.User.findOne({
            where: {
                email: 'operator@phantomhub.com'
            }
        });
        if (!operatorExists) {
            await User_1.User.create({
                username: 'operator',
                email: 'operator@phantomhub.com',
                password: 'operator123',
                role: User_1.UserRole.OPERATOR
            });
            console.log('Operator user created');
        }
        else {
            console.log('Operator user already exists');
        }
        // Create viewer user
        const viewerExists = await User_1.User.findOne({
            where: {
                email: 'viewer@phantomhub.com'
            }
        });
        if (!viewerExists) {
            await User_1.User.create({
                username: 'viewer',
                email: 'viewer@phantomhub.com',
                password: 'viewer123',
                role: User_1.UserRole.VIEWER
            });
            console.log('Viewer user created');
        }
        else {
            console.log('Viewer user already exists');
        }
        // Create sample devices
        const sampleDevices = [
            {
                name: 'Office Cable 1',
                ipAddress: '192.168.1.101',
                firmwareVersion: 'v1.2.0',
                status: 'online',
                lastCheckIn: new Date()
            },
            {
                name: 'Conference Room Cable',
                ipAddress: '192.168.1.102',
                firmwareVersion: 'v1.1.5',
                status: 'offline',
                lastCheckIn: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
            },
            {
                name: 'Lab Cable',
                ipAddress: '192.168.1.103',
                firmwareVersion: 'v1.2.0',
                status: 'busy',
                lastCheckIn: new Date()
            }
        ];
        for (const deviceData of sampleDevices) {
            const deviceExists = await Device_1.default.findOne({
                where: {
                    ipAddress: deviceData.ipAddress
                }
            });
            if (!deviceExists) {
                await Device_1.default.create(deviceData);
                console.log(`Device ${deviceData.name} created`);
            }
            else {
                console.log(`Device with IP ${deviceData.ipAddress} already exists`);
            }
        }
        console.log('Database seeded successfully');
        process.exit(0);
    }
    catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}
seedDatabase();
