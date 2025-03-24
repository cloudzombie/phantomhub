"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payloadController_1 = require("../controllers/payloadController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Public routes (none for payloads)
// Protected routes
router.use(authMiddleware_1.authenticate); // Apply authentication to all payload routes
// GET all payloads - Admin & Operator access
router.get('/', (0, authMiddleware_1.authorize)(['Administrator', 'Operator', 'Viewer']), payloadController_1.getAllPayloads);
// POST create payload - Admin & Operator access
router.post('/', (0, authMiddleware_1.authorize)(['Administrator', 'Operator']), payloadController_1.createPayload);
// POST deploy payload - Admin & Operator access
router.post('/deploy', (0, authMiddleware_1.authorize)(['Administrator', 'Operator']), payloadController_1.deployPayload);
// GET single payload - Admin & Operator access
router.get('/:id', (0, authMiddleware_1.authorize)(['Administrator', 'Operator', 'Viewer']), payloadController_1.getPayload);
// PUT update payload - Admin & Operator access (owner check in controller)
router.put('/:id', (0, authMiddleware_1.authorize)(['Administrator', 'Operator']), payloadController_1.updatePayload);
// DELETE payload - Admin & Operator access (owner check in controller)
router.delete('/:id', (0, authMiddleware_1.authorize)(['Administrator', 'Operator']), payloadController_1.deletePayload);
exports.default = router;
