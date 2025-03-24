"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserDeployments = exports.getPayloadDeployments = exports.getDeviceDeployments = exports.getDeployment = exports.getAllDeployments = void 0;
const Deployment_1 = __importDefault(require("../models/Deployment"));
const Device_1 = __importDefault(require("../models/Device"));
const Payload_1 = __importDefault(require("../models/Payload"));
const User_1 = __importDefault(require("../models/User"));
// Get all deployments
const getAllDeployments = async (req, res) => {
    try {
        const deployments = await Deployment_1.default.findAll({
            include: [
                { model: Payload_1.default, as: 'payload' },
                { model: Device_1.default, as: 'device' },
                { model: User_1.default, as: 'initiator' }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({
            success: true,
            data: deployments
        });
    }
    catch (error) {
        console.error('Error fetching all deployments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch deployments'
        });
    }
};
exports.getAllDeployments = getAllDeployments;
// Get a single deployment
const getDeployment = async (req, res) => {
    try {
        const { id } = req.params;
        const deployment = await Deployment_1.default.findByPk(id, {
            include: [
                { model: Payload_1.default, as: 'payload' },
                { model: Device_1.default, as: 'device' },
                { model: User_1.default, as: 'initiator' }
            ]
        });
        if (!deployment) {
            res.status(404).json({
                success: false,
                message: 'Deployment not found'
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: deployment
        });
    }
    catch (error) {
        console.error('Error fetching deployment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch deployment'
        });
    }
};
exports.getDeployment = getDeployment;
// Get deployments for a specific device
const getDeviceDeployments = async (req, res) => {
    try {
        const { deviceId } = req.params;
        // First check if the device exists
        const device = await Device_1.default.findByPk(deviceId);
        if (!device) {
            res.status(404).json({
                success: false,
                message: 'Device not found'
            });
            return;
        }
        const deployments = await Deployment_1.default.findAll({
            where: { deviceId },
            include: [
                { model: Payload_1.default, as: 'payload' },
                { model: Device_1.default, as: 'device' },
                { model: User_1.default, as: 'initiator' }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({
            success: true,
            data: deployments
        });
    }
    catch (error) {
        console.error('Error fetching device deployments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch device deployments'
        });
    }
};
exports.getDeviceDeployments = getDeviceDeployments;
// Get deployments for a specific payload
const getPayloadDeployments = async (req, res) => {
    try {
        const { payloadId } = req.params;
        // First check if the payload exists
        const payload = await Payload_1.default.findByPk(payloadId);
        if (!payload) {
            res.status(404).json({
                success: false,
                message: 'Payload not found'
            });
            return;
        }
        const deployments = await Deployment_1.default.findAll({
            where: { payloadId },
            include: [
                { model: Payload_1.default, as: 'payload' },
                { model: Device_1.default, as: 'device' },
                { model: User_1.default, as: 'initiator' }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({
            success: true,
            data: deployments
        });
    }
    catch (error) {
        console.error('Error fetching payload deployments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payload deployments'
        });
    }
};
exports.getPayloadDeployments = getPayloadDeployments;
// Get user's deployments
const getUserDeployments = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'User ID not found in authentication token'
            });
            return;
        }
        const deployments = await Deployment_1.default.findAll({
            where: { userId },
            include: [
                { model: Payload_1.default, as: 'payload' },
                { model: Device_1.default, as: 'device' },
                { model: User_1.default, as: 'initiator' }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({
            success: true,
            data: deployments
        });
    }
    catch (error) {
        console.error('Error fetching user deployments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user deployments'
        });
    }
};
exports.getUserDeployments = getUserDeployments;
