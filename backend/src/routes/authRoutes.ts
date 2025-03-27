import express from 'express';
import { register, login, getCurrentUser, syncToken, checkAuth, logout } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { createRateLimiterMiddleware } from '../middleware/rateLimiter';

const router = express.Router();
const authRateLimiter = createRateLimiterMiddleware('auth');

// Register a new user
router.post('/register', authRateLimiter, register);

// Login
router.post('/login', authRateLimiter, login);

// Get current user (protected route)
router.get('/me', authenticate, getCurrentUser);

// Sync token endpoint - this is critical for persistence across sessions
router.post('/sync-token', syncToken);

// Check authentication status
router.get('/check', authenticate, checkAuth);

// Logout endpoint
router.post('/logout', logout);

export default router; 