import express from 'express';
import { getAllDevices, getDevice, createDevice, updateDeviceStatus, sendPayload, getDeviceActivities } from '../controllers/deviceController';
import { authenticate, isOperator } from '../middleware/auth';
import { createRateLimiterMiddleware } from '../middleware/rateLimiter';

const router = express.Router();
const deviceRateLimiter = createRateLimiterMiddleware('devices');

// All routes are protected and require authentication
router.use(authenticate);
router.use(deviceRateLimiter);

// Get all O.MG Cables
router.get('/', getAllDevices);

// Get a single O.MG Cable
router.get('/:id', getDevice);

// Get device activities
router.get('/:id/activities', getDeviceActivities);

// Register a new O.MG Cable - requires operator or admin privileges
router.post('/', isOperator, createDevice);

// Update O.MG Cable status - requires operator or admin privileges
router.patch('/:id/status', isOperator, updateDeviceStatus);

// Send payload to O.MG Cable - requires operator or admin privileges
router.post('/:id/send-payload', isOperator, sendPayload);

export default router; 