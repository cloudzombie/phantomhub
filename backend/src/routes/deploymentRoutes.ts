import { Router } from 'express';
import { 
  getAllDeployments, 
  getDeployment, 
  getDeviceDeployments,
  getPayloadDeployments,
  getUserDeployments,
  updateDeployment
} from '../controllers/deploymentController';
import { authenticate, isOperator } from '../middleware/auth';

const router = Router();

// Public routes (none for deployments)

// Protected routes
router.use(authenticate); // Apply authentication to all deployment routes

// GET all deployments - Admin access
router.get('/', isOperator, getAllDeployments);

// GET single deployment - Admin access
router.get('/:id', isOperator, getDeployment);

// GET deployments for a specific device - Admin access
router.get('/device/:deviceId', isOperator, getDeviceDeployments);

// GET deployments for a specific payload - Admin access
router.get('/payload/:payloadId', isOperator, getPayloadDeployments);

// GET user's own deployments - All authenticated users
router.get('/user/me', getUserDeployments);

// PATCH to update deployment status with real results - All authenticated users
router.patch('/:id', updateDeployment);

export default router; 