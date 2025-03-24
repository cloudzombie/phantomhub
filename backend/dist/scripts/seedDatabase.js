"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const User_1 = require("../models/User");
const Device_1 = __importDefault(require("../models/Device"));
const Payload_1 = __importDefault(require("../models/Payload"));
const Deployment_1 = __importDefault(require("../models/Deployment"));
async function seedDatabase() {
    try {
        // Connect to database
        await (0, database_1.connectDB)();
        console.log('Database connected for seeding');
        // Sync models with database
        await User_1.User.sync({ alter: true });
        await Device_1.default.sync({ alter: true });
        await Payload_1.default.sync({ alter: true });
        await Deployment_1.default.sync({ alter: true });
        // Create admin user
        const adminPassword = 'admin123';
        const hashedPassword = await bcryptjs_1.default.hash(adminPassword, 10);
        const adminUser = await User_1.User.findOrCreate({
            where: { email: 'admin@phantomhub.com' },
            defaults: {
                username: 'admin',
                email: 'admin@phantomhub.com',
                password: hashedPassword,
                role: User_1.UserRole.ADMIN,
            }
        });
        console.log(`Admin user ${adminUser[0].username} created or already exists`);
        // Create operator user
        const operatorPassword = 'operator123';
        const hashedOperatorPassword = await bcryptjs_1.default.hash(operatorPassword, 10);
        const operatorUser = await User_1.User.findOrCreate({
            where: { email: 'operator@phantomhub.com' },
            defaults: {
                username: 'operator',
                email: 'operator@phantomhub.com',
                password: hashedOperatorPassword,
                role: User_1.UserRole.OPERATOR,
            }
        });
        console.log(`Operator user ${operatorUser[0].username} created or already exists`);
        // Create viewer user
        const viewerPassword = 'viewer123';
        const hashedViewerPassword = await bcryptjs_1.default.hash(viewerPassword, 10);
        const viewerUser = await User_1.User.findOrCreate({
            where: { email: 'viewer@phantomhub.com' },
            defaults: {
                username: 'viewer',
                email: 'viewer@phantomhub.com',
                password: hashedViewerPassword,
                role: User_1.UserRole.VIEWER,
            }
        });
        console.log(`Viewer user ${viewerUser[0].username} created or already exists`);
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
