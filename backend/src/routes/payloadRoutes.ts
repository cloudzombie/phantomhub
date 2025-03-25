import { Router } from 'express';
import { 
  getAllPayloads, 
  getPayload, 
  createPayload, 
  updatePayload, 
  deletePayload,
  deployPayload 
} from '../controllers/payloadController';
import { authenticate, isAdmin, isOperator } from '../middleware/auth';
import { createRateLimiterMiddleware } from '../middleware/rateLimiter';
import logger from '../utils/logger';

const router = Router();
const payloadRateLimiter = createRateLimiterMiddleware('payloads');

// Public routes (none for payloads)

// Protected routes
router.use(authenticate); // Apply authentication to all payload routes
router.use(payloadRateLimiter); // Apply rate limiting to all payload routes

// GET all payloads - Admin access
router.get('/', isOperator, getAllPayloads);

// POST create payload - Admin access
router.post('/', isOperator, createPayload);

// POST deploy payload - Admin access
router.post('/deploy', isOperator, deployPayload);

// GET single payload - Admin access
router.get('/:id', isOperator, getPayload);

// PUT update payload - Admin access (owner check in controller)
router.put('/:id', isOperator, updatePayload);

// DELETE payload - Authenticated access (owner check is done in controller)
router.delete('/:id', (req, res, next) => {
  logger.info(`DELETE request received for payload ID: ${req.params.id} from user ID: ${(req as any).user?.id}, Role: ${(req as any).user?.role}`);
  next();
}, authenticate, deletePayload);

export default router; 