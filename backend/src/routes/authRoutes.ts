import express from 'express';
import { register, login, getCurrentUser } from '../controllers/authController';
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

export default router; 