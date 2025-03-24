import express from 'express';
import { getUserSettings, updateUserSettings } from '../controllers/userSettingsController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Get user settings (protected route)
router.get('/settings', authenticate, getUserSettings);

// Update user settings (protected route)
router.post('/settings', authenticate, updateUserSettings);

export default router; 