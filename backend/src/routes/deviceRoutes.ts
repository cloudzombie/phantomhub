import express from 'express';
import { getAllDevices, getDevice, createDevice, updateDeviceStatus, sendPayload } from '../controllers/deviceController';
import { authenticate, isOperator } from '../middleware/auth';

const router = express.Router();

// All routes are protected and require authentication
router.use(authenticate);

// Get all O.MG Cables
router.get('/', getAllDevices);

// Get a single O.MG Cable
router.get('/:id', getDevice);

// Register a new O.MG Cable - requires operator or admin privileges
router.post('/', isOperator, createDevice);

// Update O.MG Cable status - requires operator or admin privileges
router.patch('/:id/status', isOperator, updateDeviceStatus);

// Send payload to O.MG Cable - requires operator or admin privileges
router.post('/:id/send-payload', isOperator, sendPayload);

export default router; 