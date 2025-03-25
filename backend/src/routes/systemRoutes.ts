import express from 'express';
import { getApiHealth } from '../controllers/systemController';
import { authenticate } from '../middleware/auth';
import { createRateLimiterMiddleware } from '../middleware/rateLimiter';
import logger from '../utils/logger';

const router = express.Router();
const systemRateLimiter = createRateLimiterMiddleware('system');

// Public route for health checks (no authentication required)
// Apply rate limiting to health endpoint to prevent abuse
router.get('/health', systemRateLimiter, getApiHealth);

// Add a test endpoint to emit server stats in real-time
router.get('/test-socket', authenticate, (req, res) => {
  try {
    const io = req.app.get('io');
    if (!io) {
      return res.status(500).json({
        success: false,
        message: 'Socket.IO instance not available'
      });
    }
    
    // Emit a server status update
    io.emit('server_status', {
      status: 'online',
      activeConnections: io.engine.clientsCount,
      responseTime: Math.floor(Math.random() * 20), // Random response time for testing
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
    
    return res.status(200).json({
      success: true,
      message: 'Socket test event emitted'
    });
  } catch (error) {
    logger.error('Error in test-socket endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to emit socket test event'
    });
  }
});

// Add a ping-pong test endpoint for testing socket communication
router.get('/socket-ping', authenticate, (req, res) => {
  try {
    const io = req.app.get('io');
    if (!io) {
      return res.status(500).json({
        success: false,
        message: 'Socket.IO instance not available'
      });
    }
    
    // Get the user ID from the authenticated request
    const userId = (req as any).user.id;
    
    // Broadcast a ping event to the specific user
    io.to(userId).emit('ping_test', {
      message: 'Server-initiated ping',
      timestamp: new Date().toISOString(),
      endpoint: '/api/system/socket-ping'
    });
    
    return res.status(200).json({
      success: true,
      message: 'Socket ping test initiated'
    });
  } catch (error) {
    logger.error('Error in socket-ping endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate socket ping test'
    });
  }
});

// Protected system routes would go here
// router.use(authenticate);

export default router; 