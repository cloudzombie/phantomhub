"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const User_1 = __importDefault(require("../models/User"));
async function seedDatabase() {
    try {
        // Initialize database
        await (0, database_1.initializeDatabase)();
        console.log('Database connected for seeding');
        // Create admin user
        const adminPassword = 'admin123';
        const hashedPassword = await bcryptjs_1.default.hash(adminPassword, 10);
        const [admin] = await User_1.default.findOrCreate({
            where: { email: 'admin@phantomhub.com' },
            defaults: {
                name: 'Admin User',
                email: 'admin@phantomhub.com',
                password: hashedPassword,
                role: 'admin',
                isActive: true,
                failedLoginAttempts: 0,
                mfaEnabled: false,
                sessionTimeout: 3600,
                requirePasswordChange: false
            }
        });
        console.log(`Admin user ${admin.name} created or already exists`);
        // Create operator user
        const operatorPassword = 'operator123';
        const hashedOperatorPassword = await bcryptjs_1.default.hash(operatorPassword, 10);
        const [operator] = await User_1.default.findOrCreate({
            where: { email: 'operator@phantomhub.com' },
            defaults: {
                name: 'Operator User',
                email: 'operator@phantomhub.com',
                password: hashedOperatorPassword,
                role: 'user',
                isActive: true,
                failedLoginAttempts: 0,
                mfaEnabled: false,
                sessionTimeout: 3600,
                requirePasswordChange: true
            }
        });
        console.log(`Operator user ${operator.name} created or already exists`);
        // Create viewer user
        const viewerPassword = 'viewer123';
        const hashedViewerPassword = await bcryptjs_1.default.hash(viewerPassword, 10);
        const [viewer] = await User_1.default.findOrCreate({
            where: { email: 'viewer@phantomhub.com' },
            defaults: {
                name: 'Viewer User',
                email: 'viewer@phantomhub.com',
                password: hashedViewerPassword,
                role: 'user',
                isActive: true,
                failedLoginAttempts: 0,
                mfaEnabled: false,
                sessionTimeout: 3600,
                requirePasswordChange: true
            }
        });
        console.log(`Viewer user ${viewer.name} created or already exists`);
        console.log('Database seeding completed successfully');
        process.exit(0);
    }
    catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}
// Run the seed function
seedDatabase();
