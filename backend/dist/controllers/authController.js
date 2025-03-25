"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUser = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const logger_1 = __importDefault(require("../utils/logger"));
// Register a new user
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists',
            });
        }
        // Create new user with validated role
        const user = await User_1.default.create({
            name,
            email,
            password,
            role: role || 'user',
            isActive: true,
            failedLoginAttempts: 0,
            mfaEnabled: false,
            sessionTimeout: 3600,
            requirePasswordChange: true
        });
        // Generate JWT token
        const secret = process.env.JWT_SECRET || 'default_secret';
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, secret, { expiresIn: '7d' });
        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error registering user',
        });
    }
};
exports.register = register;
// Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        logger_1.default.debug(`Login attempt for email: ${email}`);
        // Find user by email
        const user = await User_1.default.findOne({ where: { email } });
        if (!user) {
            logger_1.default.debug(`No user found with email: ${email}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }
        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            logger_1.default.debug(`Invalid password for user: ${email}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        // Generate JWT token
        const secret = process.env.JWT_SECRET || 'default_secret';
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, secret, { expiresIn: '7d' });
        logger_1.default.debug(`Login successful for user: ${email}`);
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error during login',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.login = login;
// Get current user
const getCurrentUser = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                lastLogin: user.lastLogin,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Get current user error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching user data',
        });
    }
};
exports.getCurrentUser = getCurrentUser;
