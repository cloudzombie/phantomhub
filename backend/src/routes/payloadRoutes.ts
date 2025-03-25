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

const router = Router();

// Public routes (none for payloads)

// Protected routes
router.use(authenticate); // Apply authentication to all payload routes

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

// DELETE payload - Admin access (owner check in controller)
router.delete('/:id', isOperator, deletePayload);

export default router; 