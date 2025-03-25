"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const deploymentController_1 = require("../controllers/deploymentController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public routes (none for deployments)
// Protected routes
router.use(auth_1.authenticate); // Apply authentication to all deployment routes
// GET all deployments - Admin access
router.get('/', auth_1.isOperator, deploymentController_1.getAllDeployments);
// GET single deployment - Admin access
router.get('/:id', auth_1.isOperator, deploymentController_1.getDeployment);
// GET deployments for a specific device - Admin access
router.get('/device/:deviceId', auth_1.isOperator, deploymentController_1.getDeviceDeployments);
// GET deployments for a specific payload - Admin access
router.get('/payload/:payloadId', auth_1.isOperator, deploymentController_1.getPayloadDeployments);
// GET user's own deployments - All authenticated users
router.get('/user/me', deploymentController_1.getUserDeployments);
// PATCH to update deployment status with real results - All authenticated users
router.patch('/:id', deploymentController_1.updateDeployment);
exports.default = router;
