"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const deviceController_1 = require("../controllers/deviceController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All routes are protected and require authentication
router.use(auth_1.authenticate);
// Get all O.MG Cables
router.get('/', deviceController_1.getAllDevices);
// Get a single O.MG Cable
router.get('/:id', deviceController_1.getDevice);
// Register a new O.MG Cable - requires operator or admin privileges
router.post('/', auth_1.isOperator, deviceController_1.createDevice);
// Update O.MG Cable status - requires operator or admin privileges
router.patch('/:id/status', auth_1.isOperator, deviceController_1.updateDeviceStatus);
// Send payload to O.MG Cable - requires operator or admin privileges
router.post('/:id/send-payload', auth_1.isOperator, deviceController_1.sendPayload);
exports.default = router;
