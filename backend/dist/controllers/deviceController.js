"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeviceActivities = exports.getDevices = exports.deleteDevice = exports.sendPayload = exports.updateDeviceStatus = exports.createDevice = exports.getDevice = exports.getAllDevices = void 0;
const Device_1 = __importDefault(require("../models/Device"));
const axios_1 = __importDefault(require("axios"));
const User_1 = __importDefault(require("../models/User"));
const logger_1 = __importDefault(require("../utils/logger"));
const deviceConnectionPool_1 = __importDefault(require("../services/deviceConnectionPool"));
const Activity_1 = __importDefault(require("../models/Activity"));
const sequelize_1 = require("sequelize");
// API timeout for device communication (milliseconds)
const API_TIMEOUT = 5000;
// Helper function to check device connectivity using the connection pool
const checkDeviceConnectivity = async (device) => {
    try {
        if (device.connectionType === 'network') {
            // For network devices, use the connection pool
            const connectionPool = deviceConnectionPool_1.default.getInstance();
            const client = await connectionPool.acquireConnection(device);
            if (!client) {
                logger_1.default.error(`Failed to acquire connection for device ${device.id}`);
                return false;
            }
            try {
                // Use the pooled connection to ping the device
                await client.get('/ping');
                return true;
            }
            catch (error) {
                logger_1.default.error(`Failed to ping device ${device.id}:`, error);
                return false;
            }
            finally {
                // Always release the connection back to the pool
                connectionPool.releaseConnection(device.id);
            }
        }
        else {
            // For USB devices, we'll return true as connectivity is managed from the frontend via WebSerial
            return true;
        }
    }
    catch (error) {
        logger_1.default.error(`Failed to connect to device ${device.name} (${device.id}):`, error);
        return false;
    }
};
// Get all O.MG Cables
const getAllDevices = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }
        // Check if user is an admin (can see all devices)
        const user = await User_1.default.findByPk(userId);
        if (!user) {
            logger_1.default.error(`User not found with ID: ${userId}`);
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }
        let devices;
        try {
            if (user.role === 'admin') {
                // Admins can see all devices
                devices = await Device_1.default.findAll({
                    include: [{ model: User_1.default, as: 'owner', attributes: ['id', 'name', 'email'] }]
                });
            }
            else {
                // Regular users can only see their own devices
                devices = await Device_1.default.findAll({
                    where: { userId },
                    include: [{ model: User_1.default, as: 'owner', attributes: ['id', 'name', 'email'] }]
                });
            }
        }
        catch (error) {
            logger_1.default.error('Error querying devices:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch devices from database',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
        // Check connectivity for network devices and update status
        for (const device of devices) {
            if (device.connectionType === 'network') {
                try {
                    const isConnected = await checkDeviceConnectivity(device);
                    if (isConnected && device.status !== 'online') {
                        device.status = 'online';
                        device.lastSeen = new Date();
                        await device.save();
                    }
                    else if (!isConnected && device.status !== 'offline') {
                        device.status = 'offline';
                        await device.save();
                    }
                }
                catch (error) {
                    logger_1.default.error(`Error checking connectivity for device ${device.id}:`, error);
                    // Don't fail the whole request if connectivity check fails
                    continue;
                }
            }
        }
        return res.status(200).json({
            success: true,
            data: devices,
        });
    }
    catch (error) {
        logger_1.default.error('Error in getAllDevices:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch O.MG Cables',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.getAllDevices = getAllDevices;
// Get a single O.MG Cable
const getDevice = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }
        const device = await Device_1.default.findByPk(id, {
            include: [{ model: User_1.default, as: 'owner', attributes: ['id', 'name', 'email'] }]
        });
        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'O.MG Cable not found',
            });
        }
        // Check if the device belongs to the user or if user is admin
        const user = await User_1.default.findByPk(userId);
        if (device.userId !== userId && (user === null || user === void 0 ? void 0 : user.role) !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to access this device',
            });
        }
        // Check connectivity for network devices
        if (device.connectionType === 'network') {
            const isConnected = await checkDeviceConnectivity(device);
            if (isConnected && device.status !== 'online') {
                device.status = 'online';
                device.lastSeen = new Date();
                await device.save();
            }
            else if (!isConnected && device.status !== 'offline') {
                device.status = 'offline';
                await device.save();
            }
        }
        return res.status(200).json({
            success: true,
            data: device,
        });
    }
    catch (error) {
        console.error('Error fetching O.MG Cable:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch O.MG Cable',
        });
    }
};
exports.getDevice = getDevice;
// Register a new O.MG Cable
const createDevice = async (req, res) => {
    var _a;
    try {
        const { name, ipAddress, firmwareVersion, connectionType, serialPortId } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }
        // If this is a network device, verify connectivity
        if (connectionType === 'network') {
            try {
                // Create device object for connectivity check
                const tempDevice = {
                    id: 'temp-' + Date.now(),
                    name,
                    connectionType,
                    ipAddress,
                    userId
                };
                // Use the connection pool to verify connectivity
                const isConnected = await checkDeviceConnectivity(tempDevice);
                if (!isConnected) {
                    return res.status(400).json({
                        success: false,
                        message: 'Could not connect to the O.MG Cable at the specified IP address',
                    });
                }
            }
            catch (err) {
                return res.status(400).json({
                    success: false,
                    message: 'Could not connect to the O.MG Cable at the specified IP address',
                });
            }
        }
        const deviceData = {
            name,
            userId,
            status: 'online',
            connectionType,
            ipAddress: ipAddress || null,
            serialPortId: serialPortId || null,
            firmwareVersion: firmwareVersion || null,
            errors: []
        };
        const device = await Device_1.default.create(deviceData);
        // Notify all connected clients via Socket.IO about the new device
        const io = req.app.get('io');
        if (io) {
            io.emit('device_added', device);
        }
        return res.status(201).json({
            success: true,
            message: 'O.MG Cable registered successfully',
            data: device,
        });
    }
    catch (error) {
        console.error('Error registering O.MG Cable:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to register O.MG Cable',
        });
    }
};
exports.createDevice = createDevice;
// Update O.MG Cable status
const updateDeviceStatus = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }
        const device = await Device_1.default.findByPk(id);
        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'O.MG Cable not found',
            });
        }
        // Check if the device belongs to the user or if user is admin/operator
        const user = await User_1.default.findByPk(userId);
        if (device.userId !== userId && (user === null || user === void 0 ? void 0 : user.role) !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update this device',
            });
        }
        // Try to ping the O.MG Cable to verify status for network devices
        let actualStatus = status;
        if (device.connectionType === 'network') {
            try {
                // Use the actual O.MG Cable API endpoint for status check
                const response = await axios_1.default.get(`http://${device.ipAddress}/api/status`, {
                    timeout: API_TIMEOUT
                });
                // Update status based on response
                if (response.status === 200) {
                    actualStatus = 'online';
                    device.lastSeen = new Date();
                }
                else {
                    actualStatus = 'error';
                }
            }
            catch (err) {
                actualStatus = 'offline';
            }
        }
        // Update device status
        device.status = actualStatus;
        await device.save();
        // Notify all connected clients via Socket.IO about the status update
        const io = req.app.get('io');
        if (io) {
            io.emit('device_status_updated', { id: device.id, status: device.status });
        }
        return res.status(200).json({
            success: true,
            message: 'O.MG Cable status updated successfully',
            data: device,
        });
    }
    catch (error) {
        console.error('Error updating O.MG Cable status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update O.MG Cable status',
        });
    }
};
exports.updateDeviceStatus = updateDeviceStatus;
// Send payload to O.MG Cable
const sendPayload = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const { payloadId, payloadContent } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }
        const device = await Device_1.default.findByPk(id);
        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'O.MG Cable not found',
            });
        }
        // Check if the device belongs to the user or if user is admin/operator
        const user = await User_1.default.findByPk(userId);
        if (device.userId !== userId && (user === null || user === void 0 ? void 0 : user.role) !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to send payload to this device',
            });
        }
        if (device.status !== 'online') {
            return res.status(400).json({
                success: false,
                message: 'Cannot send payload to offline O.MG Cable',
            });
        }
        // For network-connected devices, use the API
        if (device.connectionType === 'network') {
            try {
                // Fetch payload content if only ID was provided
                let content = payloadContent;
                if (!content && payloadId) {
                    // Fetch payload content from database (not implemented here)
                    // const payload = await Payload.findByPk(payloadId);
                    // content = payload?.content;
                    return res.status(400).json({
                        success: false,
                        message: 'Payload content is required for network devices',
                    });
                }
                if (!content) {
                    return res.status(400).json({
                        success: false,
                        message: 'No payload content provided',
                    });
                }
                // First enter DuckyScript mode
                await axios_1.default.post(`http://${device.ipAddress}/api/ducky/mode`, {}, {
                    timeout: API_TIMEOUT
                });
                // Then send the payload content
                await axios_1.default.post(`http://${device.ipAddress}/api/ducky/write`, { content }, { timeout: 10000 } // Longer timeout for payload write
                );
                // Execute the payload
                await axios_1.default.post(`http://${device.ipAddress}/api/ducky/execute`, {}, {
                    timeout: API_TIMEOUT
                });
                // Update device status to 'maintenance' while executing payload
                device.status = 'maintenance';
                await device.save();
                // Notify all connected clients via Socket.IO
                const io = req.app.get('io');
                if (io) {
                    io.emit('device_status_changed', {
                        id: device.id,
                        status: 'maintenance'
                    });
                    io.emit('payload_executing', {
                        deviceId: device.id,
                        payloadId: payloadId || 'custom'
                    });
                }
                return res.status(200).json({
                    success: true,
                    message: 'Payload sent to O.MG Cable successfully',
                    data: {
                        deviceId: device.id,
                        payloadId: payloadId || 'custom',
                        status: 'executing'
                    },
                });
            }
            catch (err) {
                console.error('Error communicating with O.MG Cable:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to send payload to O.MG Cable',
                    error: err instanceof Error ? err.message : 'Unknown error'
                });
            }
        }
        else {
            // For USB devices, payload deployment is handled via WebSerial on the frontend
            // Just notify that the backend acknowledges the request
            return res.status(200).json({
                success: true,
                message: 'Payload request acknowledged. USB devices require frontend deployment.',
                data: {
                    deviceId: device.id,
                    payloadId: payloadId || 'custom',
                    status: 'pending_frontend_deployment'
                },
            });
        }
    }
    catch (error) {
        console.error('Error sending payload to O.MG Cable:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send payload to O.MG Cable',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.sendPayload = sendPayload;
// Delete O.MG Cable
const deleteDevice = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }
        const device = await Device_1.default.findByPk(id);
        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'O.MG Cable not found',
            });
        }
        // Check if the device belongs to the user or if user is admin
        const user = await User_1.default.findByPk(userId);
        if (device.userId !== userId && (user === null || user === void 0 ? void 0 : user.role) !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this device',
            });
        }
        await device.destroy();
        // Notify all connected clients via Socket.IO about the device deletion
        const io = req.app.get('io');
        if (io) {
            io.emit('device_deleted', id);
        }
        return res.status(200).json({
            success: true,
            message: 'O.MG Cable deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting O.MG Cable:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete O.MG Cable',
        });
    }
};
exports.deleteDevice = deleteDevice;
const getDevices = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }
        const devices = await Device_1.default.findAll({
            where: {
                userId,
            },
            include: [{
                    model: User_1.default,
                    as: 'owner',
                    attributes: ['id', 'name', 'email'],
                }],
        });
        // Update status for each device
        for (const device of devices) {
            // For USB devices
            if (device.connectionType === 'usb') {
                // USB devices should always show as offline in the list
                // They only show as online when actively connected via WebSerial
                device.status = 'offline';
            }
            // For network devices
            else if (device.connectionType === 'network' && device.ipAddress) {
                try {
                    // Try to ping the device
                    const response = await axios_1.default.get(`http://${device.ipAddress}/api/status`, {
                        timeout: 2000 // 2 second timeout
                    });
                    device.status = response.status === 200 ? 'online' : 'offline';
                }
                catch (err) {
                    device.status = 'offline';
                }
            }
            await device.save();
        }
        return res.status(200).json({
            success: true,
            data: devices,
        });
    }
    catch (error) {
        console.error('Error fetching devices:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch devices',
        });
    }
};
exports.getDevices = getDevices;
// Get device activities
const getDeviceActivities = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }
        const device = await Device_1.default.findByPk(id);
        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found',
            });
        }
        // Check if the device belongs to the user or if user is admin/operator
        const user = await User_1.default.findByPk(userId);
        if (device.userId !== userId && (user === null || user === void 0 ? void 0 : user.role) !== 'admin' && (user === null || user === void 0 ? void 0 : user.role) !== 'operator') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view this device\'s activities',
            });
        }
        // Parse query parameters
        const limit = parseInt(req.query.limit) || 50;
        const types = req.query.types ?
            Array.isArray(req.query.types) ?
                req.query.types :
                [req.query.types]
            : undefined;
        const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : undefined;
        const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : undefined;
        // Build the query
        const whereClause = { deviceId: id };
        if (types && types.length > 0) {
            whereClause.type = { [sequelize_1.Op.in]: types };
        }
        if (dateFrom || dateTo) {
            whereClause.createdAt = {};
            if (dateFrom) {
                whereClause.createdAt[sequelize_1.Op.gte] = dateFrom;
            }
            if (dateTo) {
                whereClause.createdAt[sequelize_1.Op.lte] = dateTo;
            }
        }
        // Get activities with user info
        const activities = await Activity_1.default.findAll({
            where: whereClause,
            include: [
                {
                    model: User_1.default,
                    as: 'user',
                    attributes: ['id', 'name', 'email'],
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: Math.min(limit, 100) // Cap at 100 to prevent excessive queries
        });
        // Format the response
        const formattedActivities = activities.map(activity => {
            var _a;
            const activityData = activity.toJSON();
            return {
                id: activity.id,
                deviceId: activity.deviceId,
                type: activity.type,
                description: activity.description,
                metadata: activity.metadata,
                createdAt: activity.createdAt,
                userId: activity.userId,
                userName: (_a = activityData.user) === null || _a === void 0 ? void 0 : _a.name
            };
        });
        return res.status(200).json({
            success: true,
            data: formattedActivities,
        });
    }
    catch (error) {
        logger_1.default.error('Error retrieving device activities:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve device activities',
        });
    }
};
exports.getDeviceActivities = getDeviceActivities;
