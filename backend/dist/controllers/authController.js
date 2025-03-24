"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUser = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
// Register a new user
const register = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        // Check if user already exists
        const existingUser = await User_1.User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists',
            });
        }
        // Create new user
        const user = await User_1.User.create({
            username,
            email,
            password,
            role: role || User_1.UserRole.VIEWER,
        });
        // Generate JWT token
        const secret = process.env.JWT_SECRET || 'default_secret';
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, secret, { expiresIn: '7d' });
        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error('Registration error:', error);
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
        // Find user by email
        const user = await User_1.User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }
        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
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
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, secret, { expiresIn: '7d' });
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error during login',
        });
    }
};
exports.login = login;
// Get current user
const getCurrentUser = async (req, res) => {
    try {
        const user = req.user;
        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                lastLogin: user.lastLogin,
            },
        });
    }
    catch (error) {
        console.error('Get current user error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching user data',
        });
    }
};
exports.getCurrentUser = getCurrentUser;
