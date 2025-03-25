import express from 'express';
import { getUserSettings, updateUserSettings } from '../controllers/userSettingsController';
import { authenticate } from '../middleware/auth';
import { createRateLimiterMiddleware } from '../middleware/rateLimiter';

const router = express.Router();
const userRateLimiter = createRateLimiterMiddleware('users');

// Get user settings (protected route)
router.get('/settings', authenticate, userRateLimiter, getUserSettings);

// Update user settings (protected route)
router.post('/settings', authenticate, userRateLimiter, updateUserSettings);

export default router; 