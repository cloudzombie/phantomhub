"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOperator = exports.isAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
// Middleware to authenticate JWT token
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. Invalid token format.'
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'default_secret');
        const user = await User_1.User.findByPk(decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found or invalid token.'
            });
        }
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token.'
        });
    }
};
exports.authenticate = authenticate;
// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === User_1.UserRole.ADMIN) {
        next();
    }
    else {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin role required.'
        });
    }
};
exports.isAdmin = isAdmin;
// Middleware to check if user is operator or admin
const isOperator = (req, res, next) => {
    if (req.user && (req.user.role === User_1.UserRole.OPERATOR || req.user.role === User_1.UserRole.ADMIN)) {
        next();
    }
    else {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Operator role required.'
        });
    }
};
exports.isOperator = isOperator;
