"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const User_1 = __importDefault(require("../models/User"));
const Device_1 = __importDefault(require("../models/Device"));
async function seedDatabase() {
    try {
        // Connect to database
        await (0, database_1.initializeDatabase)();
        console.log('Database connected');
        // Check if admin user exists
        const adminExists = await User_1.default.findOne({
            where: {
                email: 'admin@phantomhub.com'
            }
        });
        if (!adminExists) {
            // Create admin user
            await User_1.default.create({
                name: 'Admin User',
                email: 'admin@phantomhub.com',
                password: 'admin123',
                role: 'admin',
                isActive: true,
                failedLoginAttempts: 0,
                mfaEnabled: false,
                sessionTimeout: 3600,
                requirePasswordChange: false
            });
            console.log('Admin user created');
        }
        else {
            console.log('Admin user already exists');
        }
        // Create operator user
        const operatorExists = await User_1.default.findOne({
            where: {
                email: 'operator@phantomhub.com'
            }
        });
        if (!operatorExists) {
            await User_1.default.create({
                name: 'Operator User',
                email: 'operator@phantomhub.com',
                password: 'operator123',
                role: 'user',
                isActive: true,
                failedLoginAttempts: 0,
                mfaEnabled: false,
                sessionTimeout: 3600,
                requirePasswordChange: true
            });
            console.log('Operator user created');
        }
        else {
            console.log('Operator user already exists');
        }
        // Create viewer user
        const viewerExists = await User_1.default.findOne({
            where: {
                email: 'viewer@phantomhub.com'
            }
        });
        if (!viewerExists) {
            await User_1.default.create({
                name: 'Viewer User',
                email: 'viewer@phantomhub.com',
                password: 'viewer123',
                role: 'user',
                isActive: true,
                failedLoginAttempts: 0,
                mfaEnabled: false,
                sessionTimeout: 3600,
                requirePasswordChange: true
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
                lastSeen: new Date(),
                connectionType: 'network'
            },
            {
                name: 'Conference Room Cable',
                ipAddress: '192.168.1.102',
                firmwareVersion: 'v1.1.5',
                status: 'offline',
                lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                connectionType: 'network'
            },
            {
                name: 'Lab Cable',
                ipAddress: '192.168.1.103',
                firmwareVersion: 'v1.2.0',
                status: 'maintenance',
                lastSeen: new Date(),
                connectionType: 'network'
            }
        ];
        // Get admin user for device ownership
        const admin = await User_1.default.findOne({
            where: {
                email: 'admin@phantomhub.com'
            }
        });
        if (!admin) {
            throw new Error('Admin user not found');
        }
        for (const deviceData of sampleDevices) {
            const deviceExists = await Device_1.default.findOne({
                where: {
                    ipAddress: deviceData.ipAddress
                }
            });
            if (!deviceExists) {
                await Device_1.default.create({
                    ...deviceData,
                    userId: admin.id
                });
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
