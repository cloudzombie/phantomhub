"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = express_1.default.Router();
const authRateLimiter = (0, rateLimiter_1.createRateLimiterMiddleware)('auth');
// Register a new user
router.post('/register', authRateLimiter, authController_1.register);
// Login
router.post('/login', authRateLimiter, authController_1.login);
// Get current user (protected route)
router.get('/me', auth_1.authenticate, authController_1.getCurrentUser);
// Sync token endpoint - this is critical for persistence across sessions
router.post('/sync-token', authController_1.syncToken);
// Check authentication status
router.get('/check', auth_1.authenticate, authController_1.checkAuth);
// Logout endpoint
router.post('/logout', authController_1.logout);
exports.default = router;
