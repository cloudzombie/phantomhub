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
// Import routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const deviceRoutes_1 = __importDefault(require("./routes/deviceRoutes"));
const payloadRoutes_1 = __importDefault(require("./routes/payloadRoutes"));
const deploymentRoutes_1 = __importDefault(require("./routes/deploymentRoutes"));
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
// Use route handlers
app.use('/api/auth', authRoutes_1.default);
app.use('/api/devices', deviceRoutes_1.default);
app.use('/api/payloads', payloadRoutes_1.default);
app.use('/api/deployments', deploymentRoutes_1.default);
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
// Start the server
async function startServer() {
    try {
        // Connect to database
        await (0, database_1.connectDB)();
        console.log('Database connected');
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
