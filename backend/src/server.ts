import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/authRoutes';
import deviceRoutes from './routes/deviceRoutes';
import payloadRoutes from './routes/payloadRoutes';
import deploymentRoutes from './routes/deploymentRoutes';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: function(origin, callback) {
      const allowedOrigins = [process.env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:5175'];
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [process.env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:5175'];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(null, true); // For now, allow all origins
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));

// Routes
app.get('/', (req, res) => {
  res.send('PHANTOM HUB API is running');
});

// Use route handlers
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/payloads', payloadRoutes);
app.use('/api/deployments', deploymentRoutes);

// Error handling middleware
app.use(errorHandler);

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
    await connectDB();
    console.log('Database connected');
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 