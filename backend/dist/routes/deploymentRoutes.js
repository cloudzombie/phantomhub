"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const deploymentController_1 = require("../controllers/deploymentController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Public routes (none for deployments)
// Protected routes
router.use(authMiddleware_1.authenticate); // Apply authentication to all deployment routes
// GET all deployments - Admin & Operator access
router.get('/', (0, authMiddleware_1.authorize)(['Administrator', 'Operator']), deploymentController_1.getAllDeployments);
// GET single deployment - Admin & Operator access
router.get('/:id', (0, authMiddleware_1.authorize)(['Administrator', 'Operator']), deploymentController_1.getDeployment);
// GET deployments for a specific device - Admin & Operator access
router.get('/device/:deviceId', (0, authMiddleware_1.authorize)(['Administrator', 'Operator']), deploymentController_1.getDeviceDeployments);
// GET deployments for a specific payload - Admin & Operator access
router.get('/payload/:payloadId', (0, authMiddleware_1.authorize)(['Administrator', 'Operator']), deploymentController_1.getPayloadDeployments);
// GET user's own deployments - All authenticated users
router.get('/user/me', deploymentController_1.getUserDeployments);
exports.default = router;
