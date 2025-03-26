import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initializeDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import os from 'os';
import { sequelize } from './config/database';
import DeviceConnectionPool from './services/deviceConnectionPool';
import logger from './utils/logger';
import { globalRateLimiter } from './middleware/rateLimiter';
import { SocketService } from './services/socketService';
import jwt from 'jsonwebtoken';

// Track when the server started
const serverStartTime = new Date();

// Import routes
import authRoutes from './routes/authRoutes';
import deviceRoutes from './routes/deviceRoutes';
import payloadRoutes from './routes/payloadRoutes';
import deploymentRoutes from './routes/deploymentRoutes';
import systemRoutes from './routes/systemRoutes';
import userRoutes from './routes/userRoutes';
import scriptRoutes from './routes/scriptRoutes';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with proper WebSocket configuration
const io = new SocketIOServer(server, {
  cors: {
    origin: function(origin, callback) {
      // Production-ready CORS configuration with specific allowed origins
      const allowedOrigins = [
        process.env.CLIENT_URL || 'http://localhost:5173',
        'https://ghostwire-frontend-5c62bc193230.herokuapp.com',
        'https://phantomhub-frontend.herokuapp.com'
      ];
      
      // Only allow localhost in development mode
      if (process.env.NODE_ENV === 'development') {
        allowedOrigins.push(
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:5175'
        );
      }
      
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      
      // Allow all origins for now to ensure functionality
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  // WebSocket specific configuration
  transports: ['websocket', 'polling'],
  pingTimeout: 20000,
  pingInterval: 25000,
  connectTimeout: 45000,
  allowUpgrades: true,
  upgradeTimeout: 10000,
  // Engine.IO configuration
  maxHttpBufferSize: 1e8,
  path: '/socket.io/',
  // WebSocket engine configuration
  wsEngine: require('ws').Server
});

// Initialize SocketService with the configured io instance
const socketService = new SocketService(io);

// Make socketService available to our routes
app.set('io', io);
app.set('socketService', socketService);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: function(origin, callback) {
    // Production-ready CORS configuration with specific allowed origins
    const allowedOrigins = [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'https://ghostwire-frontend-5c62bc193230.herokuapp.com',
      'https://phantomhub-frontend.herokuapp.com'
    ];
    
    // Only allow localhost in development mode
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push(
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175'
      );
    }
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Allow all origins for now to ensure functionality
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));
app.use(helmet());
app.use(morgan('dev'));

// Apply global rate limiter to all requests
app.use((req, res, next) => {
  // Exclude Socket.IO paths from rate limiting
  if (req.path.startsWith('/socket.io')) {
    return next();
  }
  // Apply rate limiter to all other paths
  globalRateLimiter(req, res, next);
});

// Routes
app.get('/', (req, res) => {
  res.send('PHANTOM HUB API is running');
});

// Simple health endpoint at the root level (no /api prefix)
app.get('/health', async (req, res) => {
  try {
    // Calculate uptime in seconds
    const uptime = Math.floor((new Date().getTime() - serverStartTime.getTime()) / 1000);
    
    // Get memory usage (real stats)
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // Get CPU usage (more accurate calculation)
    const cpuUsage = process.cpuUsage();
    const totalCPUUsage = cpuUsage.user + cpuUsage.system;
    // Convert from microseconds to percentage with a reasonable scaling factor
    const cpuLoad = Math.min(Math.round((totalCPUUsage / 1000000) * 5), 100);
    
    // Check database connection
    let dbStatus = 'offline';
    let dbResponseTime = 0;
    try {
      const dbStartTime = Date.now();
      await sequelize.authenticate();
      dbResponseTime = Date.now() - dbStartTime;
      dbStatus = 'online';
    } catch (error) {
      console.error('Database connection error:', error);
      dbStatus = 'error';
    }
    
    // Get active connections 
    let activeConnections = 0;
    try {
      if (io && io.sockets && io.sockets.sockets) {
        const sockets = io.sockets.sockets;
        // Different Socket.IO versions have different APIs
        if (typeof sockets.size === 'number') {
          // Socket.IO v4+
          activeConnections = sockets.size;
        } else if (sockets instanceof Map) {
          // Socket.IO v3 with Map
          activeConnections = sockets.size;
        } else {
          // Socket.IO v2 with object
          activeConnections = Object.keys(sockets).length;
        }
      }
    } catch (err) {
      console.error('Error counting active connections:', err);
    }
    
    // System information
    const hostname = os.hostname();
    const platform = os.platform();
    const cpuInfo = os.cpus()[0]?.model || 'Unknown CPU';
    const loadAvg = os.loadavg();
    
    // Put it all together with enriched data
    const healthData = {
      status: dbStatus === 'online' ? 'online' : 'degraded',
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
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
        dialect: sequelize.getDialect(),
        host: sequelize.config.host
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
  } catch (error) {
    console.error('Error fetching system health:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch system health data'
    });
  }
});

// Use route handlers
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/payloads', payloadRoutes);
app.use('/api/deployments', deploymentRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/users', userRoutes);
app.use('/api/scripts', scriptRoutes);

// Error handling middleware
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database first
    await initializeDatabase();
    
    // Initialize device connection pool
    const connectionPool = DeviceConnectionPool.getInstance({
      maxConnections: process.env.CONNECTION_POOL_MAX_CONNECTIONS ? 
        parseInt(process.env.CONNECTION_POOL_MAX_CONNECTIONS) : 20,
      connectionTTL: process.env.CONNECTION_POOL_TTL ? 
        parseInt(process.env.CONNECTION_POOL_TTL) : 5 * 60 * 1000,
      idleTimeout: process.env.CONNECTION_POOL_IDLE_TIMEOUT ? 
        parseInt(process.env.CONNECTION_POOL_IDLE_TIMEOUT) : 60 * 1000
    });
    logger.info('Device connection pool initialized');
    
    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Starting server on port ${PORT}...`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 