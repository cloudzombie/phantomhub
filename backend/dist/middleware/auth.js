"use strict";
/**
 * Authentication Middleware
 *
 * Enterprise-grade authentication with RBAC, rate limiting,
 * token blacklisting, and comprehensive security measures
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blacklistToken = exports.isOperator = exports.isAdmin = exports.requireRole = exports.requirePermission = exports.authenticate = exports.rateLimitMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const ioredis_1 = require("ioredis");
const logger_1 = __importDefault(require("../utils/logger"));
const User_1 = __importDefault(require("../models/User"));
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
// Initialize Redis client for token blacklist and rate limiting
const redis = new ioredis_1.Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3
});
// Rate limiter configuration
const rateLimiter = new rate_limiter_flexible_1.RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'middleware',
    points: 10, // 10 requests
    duration: 1, // per 1 second
});
const roleHierarchy = {
    admin: 3,
    operator: 2,
    user: 1
};
// Define permissions for each role
const rolePermissions = {
    admin: ['*'], // Admin has all permissions
    operator: [
        'read:devices',
        'write:devices',
        'read:payloads',
        'write:payloads',
        'read:deployments',
        'write:deployments'
    ],
    user: [
        'read:devices',
        'read:payloads',
        'read:deployments'
    ]
};
// Check if a role has a specific permission
const hasPermission = (role, requiredPermission) => {
    const permissions = rolePermissions[role];
    return permissions.includes('*') || permissions.includes(requiredPermission);
};
// Rate limiting middleware
exports.rateLimitMiddleware = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
});
// Token blacklist check
const isTokenBlacklisted = async (token) => {
    const blacklisted = await redis.get(`blacklist:${token}`);
    return !!blacklisted;
};
// Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        // Rate limiting
        try {
            await rateLimiter.consume(req.ip || 'unknown');
        }
        catch (error) {
            res.status(429).json({ error: 'Too many requests' });
            return;
        }
        console.log('Running authenticate middleware');
        console.log('Headers:', JSON.stringify(req.headers));
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.log('No authorization header found');
            res.status(401).json({ error: 'No authorization header' });
            return;
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            console.log('No token provided in Authorization header');
            res.status(401).json({ error: 'No token provided' });
            return;
        }
        console.log('Token received, checking blacklist');
        // Check if token is blacklisted
        if (await isTokenBlacklisted(token)) {
            console.log('Token is blacklisted');
            res.status(401).json({ error: 'Token has been revoked' });
            return;
        }
        console.log('Verifying token with JWT_SECRET');
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        console.log('Token decoded successfully:', JSON.stringify(decoded));
        // Find user and include their permissions
        const user = await User_1.default.findByPk(decoded.id);
        if (!user) {
            console.log(`User with ID ${decoded.id} not found`);
            res.status(401).json({ error: 'User not found' });
            return;
        }
        // Check if user is active
        if (!user.isActive) {
            console.log(`User ${user.id} is inactive`);
            res.status(401).json({ error: 'User account is inactive' });
            return;
        }
        console.log(`User found: ${user.id}, role: ${user.role}`);
        // Attach user and their permissions to request
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: rolePermissions[user.role]
        };
        // Update last activity
        await user.update({ lastLogin: new Date() });
        console.log('Authentication successful, proceeding to next middleware/handler');
        next();
    }
    catch (error) {
        logger_1.default.error('Authentication error:', error);
        console.error('Authentication error details:', error);
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({ error: 'Token has expired' });
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({ error: 'Invalid token' });
        }
        else {
            res.status(401).json({ error: 'Authentication failed' });
        }
    }
};
exports.authenticate = authenticate;
// Permission middleware factory
const requirePermission = (permission) => {
    return async (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        if (!hasPermission(req.user.role, permission)) {
            res.status(403).json({ error: `Required permission: ${permission}` });
            return;
        }
        next();
    };
};
exports.requirePermission = requirePermission;
// Role middleware factory
const requireRole = (minimumRole) => {
    return async (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const userRoleLevel = roleHierarchy[req.user.role];
        const requiredRoleLevel = roleHierarchy[minimumRole];
        if (userRoleLevel < requiredRoleLevel) {
            res.status(403).json({ error: `Required role: ${minimumRole}` });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
// Convenience middleware for common roles
exports.isAdmin = (0, exports.requireRole)('admin');
exports.isOperator = (0, exports.requireRole)('operator');
// Token blacklisting (for logout)
const blacklistToken = async (token) => {
    try {
        const decoded = jsonwebtoken_1.default.decode(token);
        if (decoded && decoded.exp) {
            const timeToExpiry = decoded.exp - Math.floor(Date.now() / 1000);
            await redis.setex(`blacklist:${token}`, timeToExpiry, 'true');
        }
    }
    catch (error) {
        logger_1.default.error('Error blacklisting token:', error);
        throw error;
    }
};
exports.blacklistToken = blacklistToken;
