"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payloadController_1 = require("../controllers/payloadController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public routes (none for payloads)
// Protected routes
router.use(auth_1.authenticate); // Apply authentication to all payload routes
// GET all payloads - Admin access
router.get('/', auth_1.isOperator, payloadController_1.getAllPayloads);
// POST create payload - Admin access
router.post('/', auth_1.isOperator, payloadController_1.createPayload);
// POST deploy payload - Admin access
router.post('/deploy', auth_1.isOperator, payloadController_1.deployPayload);
// GET single payload - Admin access
router.get('/:id', auth_1.isOperator, payloadController_1.getPayload);
// PUT update payload - Admin access (owner check in controller)
router.put('/:id', auth_1.isOperator, payloadController_1.updatePayload);
// DELETE payload - Admin access (owner check in controller)
router.delete('/:id', auth_1.isOperator, payloadController_1.deletePayload);
exports.default = router;
