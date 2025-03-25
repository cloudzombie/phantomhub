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

const router = Router();

// Public endpoint for script execution (device callbacks)
router.post('/execute/:endpoint', executeScript);

// Protected routes
router.use(authenticate);

// All scripts operations require operator permissions
router.use(isOperator);

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