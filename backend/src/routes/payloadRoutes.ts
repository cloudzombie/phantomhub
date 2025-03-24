import { Router } from 'express';
import { 
  getAllPayloads, 
  getPayload, 
  createPayload, 
  updatePayload, 
  deletePayload,
  deployPayload 
} from '../controllers/payloadController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

// Public routes (none for payloads)

// Protected routes
router.use(authenticate); // Apply authentication to all payload routes

// GET all payloads - Admin & Operator access
router.get('/', authorize(['Administrator', 'Operator', 'Viewer']), getAllPayloads);

// POST create payload - Admin & Operator access
router.post('/', authorize(['Administrator', 'Operator']), createPayload);

// POST deploy payload - Admin & Operator access
router.post('/deploy', authorize(['Administrator', 'Operator']), deployPayload);

// GET single payload - Admin & Operator access
router.get('/:id', authorize(['Administrator', 'Operator', 'Viewer']), getPayload);

// PUT update payload - Admin & Operator access (owner check in controller)
router.put('/:id', authorize(['Administrator', 'Operator']), updatePayload);

// DELETE payload - Admin & Operator access (owner check in controller)
router.delete('/:id', authorize(['Administrator', 'Operator']), deletePayload);

export default router; 