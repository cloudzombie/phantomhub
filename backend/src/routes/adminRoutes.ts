import { Router } from 'express';
import { 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser, 
  changeUserRole, 
  resetUserPassword 
} from '../controllers/admin/adminUserController';
import { 
  getSystemStats, 
  getApplicationLogs, 
  getSystemHealth, 
  toggleMaintenanceMode 
} from '../controllers/admin/adminSystemController';
import { authenticate, isAdmin } from '../middleware/auth';
import { createRateLimiterMiddleware } from '../middleware/rateLimiter';
import logger from '../utils/logger';

const router = Router();

// Create a specific rate limiter for admin routes
const adminRateLimiter = createRateLimiterMiddleware('admin');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);
router.use(adminRateLimiter);

// Audit logging middleware for admin actions
router.use((req, res, next) => {
  const adminUser = (req as any).user;
  logger.info(`Admin action: ${req.method} ${req.originalUrl} by ${adminUser?.name} (${adminUser?.id})`);
  next();
});

// User management routes
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/role', changeUserRole);
router.put('/users/:id/reset-password', resetUserPassword);

// System management routes
router.get('/system/stats', getSystemStats);
router.get('/system/logs', getApplicationLogs);
router.get('/system/health', getSystemHealth);
router.post('/system/maintenance', toggleMaintenanceMode);

export default router;
