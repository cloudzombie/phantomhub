"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const database_1 = require("./config/database");
const errorHandler_1 = require("./middleware/errorHandler");
const os_1 = __importDefault(require("os"));
// Track when the server started
const serverStartTime = new Date();
// Import routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const deviceRoutes_1 = __importDefault(require("./routes/deviceRoutes"));
const payloadRoutes_1 = __importDefault(require("./routes/payloadRoutes"));
const deploymentRoutes_1 = __importDefault(require("./routes/deploymentRoutes"));
const systemRoutes_1 = __importDefault(require("./routes/systemRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
// Load environment variables
dotenv_1.default.config();
// Initialize Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Create HTTP server
const server = http_1.default.createServer(app);
// Initialize Socket.IO
const io = new socket_io_1.Server(server, {
    cors: {
        origin: function (origin, callback) {
            const allowedOrigins = [process.env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:5175'];
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin)
                return callback(null, true);
            if (allowedOrigins.indexOf(origin) !== -1) {
                return callback(null, true);
            }
            return callback(null, true); // For now, allow all origins
        },
        methods: ['GET', 'POST'],
        credentials: true
    }
});
// Make io available to our routes
app.set('io', io);
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        const allowedOrigins = [process.env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:5175'];
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        return callback(null, true); // For now, allow all origins
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('dev'));
// Routes
app.get('/', (req, res) => {
    res.send('PHANTOM HUB API is running');
});
// Simple health endpoint at the root level (no /api prefix)
app.get('/health', (req, res) => {
    var _a;
    try {
        // Calculate uptime in seconds
        const uptime = Math.floor((new Date().getTime() - serverStartTime.getTime()) / 1000);
        // Get memory usage (real stats)
        const totalMemory = os_1.default.totalmem();
        const freeMemory = os_1.default.freemem();
        const usedMemory = totalMemory - freeMemory;
        // Get CPU usage (more accurate calculation)
        const cpuUsage = process.cpuUsage();
        const totalCPUUsage = cpuUsage.user + cpuUsage.system;
        // Convert from microseconds to percentage with a reasonable scaling factor
        const cpuLoad = Math.min(Math.round((totalCPUUsage / 1000000) * 5), 100);
        // Get active connections 
        let activeConnections = 0;
        try {
            if (io && io.sockets && io.sockets.sockets) {
                const sockets = io.sockets.sockets;
                // Different Socket.IO versions have different APIs
                if (typeof sockets.size === 'number') {
                    // Socket.IO v4+
                    activeConnections = sockets.size;
                }
                else if (sockets instanceof Map) {
                    // Socket.IO v3 with Map
                    activeConnections = sockets.size;
                }
                else {
                    // Socket.IO v2 with object
                    activeConnections = Object.keys(sockets).length;
                }
            }
        }
        catch (err) {
            console.error('Error counting active connections:', err);
        }
        // System information
        const hostname = os_1.default.hostname();
        const platform = os_1.default.platform();
        const cpuInfo = ((_a = os_1.default.cpus()[0]) === null || _a === void 0 ? void 0 : _a.model) || 'Unknown CPU';
        const loadAvg = os_1.default.loadavg();
        // Put it all together with enriched data
        const healthData = {
            status: 'online',
            version: 'v1.0.0 Beta',
            uptime,
            hostname,
            platform,
            cpuInfo,
            loadAvg: loadAvg.map(load => load.toFixed(2)),
            memory: {
                used: Math.round(usedMemory / (1024 * 1024)), // in MB
                total: Math.round(totalMemory / (1024 * 1024)), // in MB
                percentage: Math.round((usedMemory / totalMemory) * 100)
            },
            activeConnections,
            responseTime: 0, // This will be calculated on the client side
            cpuLoad,
            processes: {
                pid: process.pid,
                memoryUsage: Math.round(process.memoryUsage().rss / (1024 * 1024)) // in MB
            },
            lastChecked: new Date()
        };
        return res.status(200).json({
            success: true,
            data: healthData
        });
    }
    catch (error) {
        console.error('Error fetching system health:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch system health data'
        });
    }
});
// Use route handlers
app.use('/api/auth', authRoutes_1.default);
app.use('/api/devices', deviceRoutes_1.default);
app.use('/api/payloads', payloadRoutes_1.default);
app.use('/api/deployments', deploymentRoutes_1.default);
app.use('/api/system', systemRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
// Error handling middleware
app.use(errorHandler_1.errorHandler);
// Socket.IO connection handler
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    // Listen for device status updates
    socket.on('device_status_update', (data) => {
        // Broadcast device status update to all connected clients
        io.emit('device_status_changed', data);
    });
    // Listen for payload execution events
    socket.on('payload_executing', (data) => {
        io.emit('payload_status_update', {
            ...data,
            status: 'executing'
        });
    });
    // Listen for payload completion events
    socket.on('payload_completed', (data) => {
        io.emit('payload_status_update', {
            ...data,
            status: 'completed'
        });
    });
    // Listen for deployment status updates
    socket.on('deployment_status_update', (data) => {
        io.emit('deployment_status_changed', data);
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});
// Initialize database and start server
const startServer = async () => {
    try {
        // Initialize database first
        await (0, database_1.initializeDatabase)();
        // Start server
        server.listen(PORT, () => {
            console.log(`🚀 Starting server on port ${PORT}...`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
