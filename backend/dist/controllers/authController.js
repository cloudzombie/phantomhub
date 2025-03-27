"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.getCurrentUser = exports.checkAuth = exports.syncToken = exports.login = exports.register = void 0;
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
        // Set HTTP-only cookie with the token
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Secure in production
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? '.herokuapp.com' : undefined
        });
        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token, // Still include token in response for backward compatibility
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
        // Set HTTP-only cookie with the token
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Secure in production
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? '.herokuapp.com' : undefined
        });
        logger_1.default.debug(`Login successful for user: ${email}`);
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token, // Still include token in response for backward compatibility
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
// Sync token endpoint to persist authentication tokens on the server
const syncToken = async (req, res) => {
    try {
        // Get token from either request body or cookie
        let token = req.body.token;
        // If no token in body, try to get from cookie
        if (!token && req.cookies && req.cookies.auth_token) {
            token = req.cookies.auth_token;
        }
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required'
            });
        }
        // Verify the token is valid before storing it
        try {
            const secret = process.env.JWT_SECRET || 'default_secret';
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            const userId = decoded.id;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid token format'
                });
            }
            // Set HTTP-only cookie with the token if it came from body
            if (req.body.token) {
                res.cookie('auth_token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                    path: '/',
                    domain: process.env.NODE_ENV === 'production' ? '.herokuapp.com' : undefined
                });
            }
            // Find the user to ensure they exist
            const user = await User_1.default.findByPk(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            // Store the token in user's session data (you could create a Session model for this)
            // For now, we'll just update a lastActive timestamp as a simple way to track sessions
            await user.update({
                lastLogin: new Date(),
                sessionToken: token // Adding token to user record for persistence
            });
            logger_1.default.info(`Token synchronized for user ${userId}`);
            return res.status(200).json({
                success: true,
                message: 'Token synchronized successfully'
            });
        }
        catch (jwtError) {
            logger_1.default.error('Token sync error - Invalid token:', jwtError);
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
    }
    catch (error) {
        logger_1.default.error('Token sync error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error synchronizing token'
        });
    }
};
exports.syncToken = syncToken;
// Check authentication status
const checkAuth = async (req, res) => {
    try {
        // If the request made it past the authentication middleware,
        // the user is authenticated
        if (req.user) {
            return res.status(200).json({
                success: true,
                message: 'Authenticated',
                user: {
                    id: req.user.id,
                    name: req.user.name,
                    email: req.user.email,
                    role: req.user.role
                }
            });
        }
        else {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }
    }
    catch (error) {
        logger_1.default.error('Error checking authentication:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error checking authentication'
        });
    }
};
exports.checkAuth = checkAuth;
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
// Logout user
const logout = async (req, res) => {
    try {
        // Clear the auth cookie
        res.clearCookie('auth_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? '.herokuapp.com' : undefined
        });
        // Also clear any theme or preference cookies
        res.clearCookie('theme_preference', {
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? '.herokuapp.com' : undefined
        });
        return res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        logger_1.default.error('Logout error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error during logout'
        });
    }
};
exports.logout = logout;
