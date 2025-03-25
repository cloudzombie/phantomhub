"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployPayload = exports.deletePayload = exports.updatePayload = exports.createPayload = exports.getPayload = exports.getAllPayloads = void 0;
const Payload_1 = __importDefault(require("../models/Payload"));
const Device_1 = __importDefault(require("../models/Device"));
const Deployment_1 = __importDefault(require("../models/Deployment"));
// Get all payloads
const getAllPayloads = async (req, res) => {
    try {
        const payloads = await Payload_1.default.findAll({
            include: [{ association: 'creator', attributes: ['id', 'username', 'email'] }]
        });
        return res.status(200).json({
            success: true,
            data: payloads,
        });
    }
    catch (error) {
        console.error('Error fetching payloads:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch payloads',
        });
    }
};
exports.getAllPayloads = getAllPayloads;
// Get a single payload
const getPayload = async (req, res) => {
    try {
        const { id } = req.params;
        const payload = await Payload_1.default.findByPk(id, {
            include: [{ association: 'creator', attributes: ['id', 'username', 'email'] }]
        });
        if (!payload) {
            return res.status(404).json({
                success: false,
                message: 'Payload not found',
            });
        }
        return res.status(200).json({
            success: true,
            data: payload,
        });
    }
    catch (error) {
        console.error('Error fetching payload:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch payload',
        });
    }
};
exports.getPayload = getPayload;
// Create a new payload
const createPayload = async (req, res) => {
    var _a;
    try {
        const { name, script, description } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required',
            });
        }
        const payload = await Payload_1.default.create({
            name: name,
            script: script,
            description: description,
            userId: req.user.id
        });
        return res.status(201).json({
            success: true,
            message: 'Payload created successfully',
            data: payload,
        });
    }
    catch (error) {
        console.error('Error creating payload:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create payload',
        });
    }
};
exports.createPayload = createPayload;
// Update an existing payload
const updatePayload = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const { name, script, description } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required',
            });
        }
        const payload = await Payload_1.default.findByPk(id);
        if (!payload) {
            return res.status(404).json({
                success: false,
                message: 'Payload not found',
            });
        }
        // Check if the user is the creator of the payload
        if (payload.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this payload',
            });
        }
        await payload.update({
            name,
            script,
            description,
        });
        return res.status(200).json({
            success: true,
            message: 'Payload updated successfully',
            data: payload,
        });
    }
    catch (error) {
        console.error('Error updating payload:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update payload',
        });
    }
};
exports.updatePayload = updatePayload;
// Delete a payload
const deletePayload = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required',
            });
        }
        const payload = await Payload_1.default.findByPk(id);
        if (!payload) {
            return res.status(404).json({
                success: false,
                message: 'Payload not found',
            });
        }
        // Check if the user is the creator of the payload
        if (payload.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this payload',
            });
        }
        await payload.destroy();
        return res.status(200).json({
            success: true,
            message: 'Payload deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting payload:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete payload',
        });
    }
};
exports.deletePayload = deletePayload;
// Deploy a payload to a device
const deployPayload = async (req, res) => {
    try {
        const { payloadId, deviceId, connectionType } = req.body;
        // Input validation
        if (!payloadId || !deviceId) {
            return res.status(400).json({
                success: false,
                message: 'Both payloadId and deviceId are required',
            });
        }
        // Validate connection type
        if (!connectionType || !['usb', 'network'].includes(connectionType)) {
            return res.status(400).json({
                success: false,
                message: 'Connection type must be either "usb" or "network"',
            });
        }
        // Find the payload
        const payload = await Payload_1.default.findByPk(payloadId);
        if (!payload) {
            return res.status(404).json({
                success: false,
                message: 'Payload not found',
            });
        }
        // Find the device
        const device = await Device_1.default.findByPk(deviceId);
        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found',
            });
        }
        // Check if device is online
        if (device.status !== 'online') {
            return res.status(400).json({
                success: false,
                message: 'Device is not available for payload deployment',
            });
        }
        // Create deployment record
        const deployment = await Deployment_1.default.create({
            payloadId: payloadId,
            deviceId: deviceId,
            userId: req.user.id,
            status: 'pending'
        });
        try {
            // Update device status to 'maintenance'
            await device.update({ status: 'maintenance' });
            // Update deployment status to 'executing'
            await deployment.update({ status: 'executing' });
            // Notify clients via Socket.IO
            const io = req.app.get('io');
            if (io) {
                io.emit('device_status_changed', {
                    id: device.id,
                    status: 'maintenance'
                });
                io.emit('deployment_status_changed', {
                    id: deployment.id,
                    status: 'executing'
                });
            }
            // For USB devices, the frontend will handle the actual communication and update the deployment
            // For network devices, we handle it here with API calls or simulation
            if (connectionType !== 'usb') {
                // For network devices, communicate with the O.MG Cable API (or simulate)
                // Create a promise for network device execution
                const executeNetworkPayload = new Promise(async (resolve, reject) => {
                    try {
                        // Simulate network device execution (would be real API call in production)
                        await new Promise(r => setTimeout(r, 5000)); // 5-second execution time
                        // Update deployment status to 'completed'
                        await deployment.update({
                            status: 'completed',
                            result: JSON.stringify({
                                success: true,
                                executionTime: Math.floor(Math.random() * 5000) + 1000,
                                output: "Network Command executed successfully",
                                timestamp: new Date()
                            })
                        });
                        // Update device status back to 'online'
                        await device.update({ status: 'online' });
                        // Notify clients via Socket.IO
                        if (io) {
                            io.emit('device_status_changed', {
                                id: device.id,
                                status: 'online'
                            });
                            io.emit('deployment_status_changed', {
                                id: deployment.id,
                                status: 'completed'
                            });
                        }
                        resolve();
                    }
                    catch (error) {
                        console.error('Error in network payload execution:', error);
                        reject(error);
                    }
                });
                // Execute the network payload in the background
                executeNetworkPayload.catch(async (error) => {
                    console.error('Network payload execution failed:', error);
                    // Update deployment status to 'failed'
                    await deployment.update({
                        status: 'failed',
                        result: JSON.stringify({
                            success: false,
                            error: 'Failed to execute network payload',
                            timestamp: new Date()
                        })
                    });
                    // Update device status back to 'online'
                    await device.update({ status: 'online' });
                    // Notify clients
                    if (io) {
                        io.emit('device_status_changed', {
                            id: device.id,
                            status: 'online'
                        });
                        io.emit('deployment_status_changed', {
                            id: deployment.id,
                            status: 'failed'
                        });
                    }
                });
            }
            return res.status(200).json({
                success: true,
                message: 'Payload deployment initiated',
                data: deployment,
            });
        }
        catch (error) {
            console.error('Error during payload deployment:', error);
            // Update deployment status to 'failed'
            await deployment.update({
                status: 'failed',
                result: JSON.stringify({
                    success: false,
                    error: 'Failed to execute payload',
                    timestamp: new Date()
                })
            });
            // Update device status back to 'online'
            await device.update({ status: 'online' });
            // Notify clients
            const io = req.app.get('io');
            if (io) {
                io.emit('device_status_changed', {
                    id: device.id,
                    status: 'online'
                });
                io.emit('deployment_status_changed', {
                    id: deployment.id,
                    status: 'failed'
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Failed to deploy payload',
            });
        }
    }
    catch (error) {
        console.error('Error in payload deployment:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while processing deployment',
        });
    }
};
exports.deployPayload = deployPayload;
