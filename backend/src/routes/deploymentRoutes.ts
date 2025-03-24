import { Router } from 'express';
import { 
  getAllDeployments, 
  getDeployment, 
  getDeviceDeployments,
  getPayloadDeployments,
  getUserDeployments,
  updateDeployment
} from '../controllers/deploymentController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

// Public routes (none for deployments)

// Protected routes
router.use(authenticate); // Apply authentication to all deployment routes

// GET all deployments - Admin & Operator access
router.get('/', authorize(['Administrator', 'Operator']), getAllDeployments);

// GET single deployment - Admin & Operator access
router.get('/:id', authorize(['Administrator', 'Operator']), getDeployment);

// GET deployments for a specific device - Admin & Operator access
router.get('/device/:deviceId', authorize(['Administrator', 'Operator']), getDeviceDeployments);

// GET deployments for a specific payload - Admin & Operator access
router.get('/payload/:payloadId', authorize(['Administrator', 'Operator']), getPayloadDeployments);

// GET user's own deployments - All authenticated users
router.get('/user/me', getUserDeployments);

// PATCH to update deployment status with real results - All authenticated users
router.patch('/:id', updateDeployment);

export default router; 