import { Router } from 'express';
import {
  getAllScripts,
  getScript,
  createScript,
  updateScript,
  deleteScript,
  associateScriptWithPayload,
  removeScriptFromPayload,
  getScriptsForPayload,
  executeScript
} from '../controllers/scriptController';
import { authenticate, isOperator } from '../middleware/auth';
import { createRateLimiterMiddleware } from '../middleware/rateLimiter';

const router = Router();
const scriptRateLimiter = createRateLimiterMiddleware('scripts');

/**
 * SECURITY NOTICE:
 * The /execute/:endpoint path is a public endpoint for receiving callbacks from devices.
 * For security reasons:
 * - 'callback' scripts only track execution and update counters
 * - 'exfiltration' scripts store data and optionally forward to a callback URL
 * - 'command' scripts are executed in a secure Node.js VM sandbox with no file/network access
 * - 'custom' scripts are handled client-side only
 * 
 * DO NOT modify this behavior without a thorough security review!
 */
// Public endpoint for script execution (device callbacks)
// Apply rate limiting to prevent abuse of public endpoint
router.post('/execute/:endpoint', scriptRateLimiter, executeScript);

// Protected routes
router.use(authenticate);

// All scripts operations require operator permissions
router.use(isOperator);

// Apply rate limiting to all authenticated script routes
router.use(scriptRateLimiter);

// GET all scripts
router.get('/', getAllScripts);

// POST create script
router.post('/', createScript);

// GET a specific script
router.get('/:id', getScript);

// PUT update script
router.put('/:id', updateScript);

// DELETE script
router.delete('/:id', deleteScript);

// GET scripts for a specific payload
router.get('/payload/:payloadId', getScriptsForPayload);

// POST associate script with payload
router.post('/associate', associateScriptWithPayload);

// POST remove script from payload
router.post('/disassociate', removeScriptFromPayload);

export default router; 