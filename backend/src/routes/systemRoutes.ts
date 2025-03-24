import express from 'express';
import { getApiHealth } from '../controllers/systemController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public route for health checks (no authentication required)
router.get('/health', getApiHealth);

// Protected system routes would go here
// router.use(authenticate);

export default router; 