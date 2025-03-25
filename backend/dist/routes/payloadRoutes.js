"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payloadController_1 = require("../controllers/payloadController");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
const payloadRateLimiter = (0, rateLimiter_1.createRateLimiterMiddleware)('payloads');
// Public routes (none for payloads)
// Protected routes
router.use(auth_1.authenticate); // Apply authentication to all payload routes
router.use(payloadRateLimiter); // Apply rate limiting to all payload routes
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
// DELETE payload - Authenticated access (owner check is done in controller)
router.delete('/:id', (req, res, next) => {
    var _a, _b;
    logger_1.default.info(`DELETE request received for payload ID: ${req.params.id} from user ID: ${(_a = req.user) === null || _a === void 0 ? void 0 : _a.id}, Role: ${(_b = req.user) === null || _b === void 0 ? void 0 : _b.role}`);
    next();
}, auth_1.authenticate, payloadController_1.deletePayload);
exports.default = router;
