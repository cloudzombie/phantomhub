import express from 'express';
import { getApiHealth } from '../controllers/systemController';
import { authenticate } from '../middleware/auth';
import { createRateLimiterMiddleware } from '../middleware/rateLimiter';

const router = express.Router();
const systemRateLimiter = createRateLimiterMiddleware('system');

// Public route for health checks (no authentication required)
// Apply rate limiting to health endpoint to prevent abuse
router.get('/health', systemRateLimiter, getApiHealth);

// Protected system routes would go here
// router.use(authenticate);

export default router; 