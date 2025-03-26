import { Request, Response } from 'express';
import os from 'os';
import { Redis } from 'ioredis';

// Import Redis configuration function
const getRedisConfig = () => {
  if (process.env.REDIS_URL) {
    try {
      const redisUrl = new URL(process.env.REDIS_URL);
      return {
        host: redisUrl.hostname,
        port: Number(redisUrl.port),
        password: redisUrl.password,
        tls: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
      };
    } catch (error) {
      console.error('Error parsing REDIS_URL:', error);
    }
  }
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined
  };
};

// Track when the server started
const serverStartTime = new Date();

// Get API health metrics
export const getApiHealth = async (req: Request, res: Response) => {
  try {
    // Calculate uptime in seconds
    const uptime = Math.floor((new Date().getTime() - serverStartTime.getTime()) / 1000);
    
    // Get memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // Get CPU load
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    for (let i = 0; i < cpus.length; i++) {
      const cpu = cpus[i];
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }
    
    // Approximate CPU load percentage (not perfect but gives an idea)
    const cpuLoad = Math.round(100 - (totalIdle / totalTick) * 100);
    
    // Get active connections - safely handle Socket.IO access
    let activeConnections = 0;
    try {
      const io = req.app.get('io');
      if (io && io.sockets && io.sockets.sockets) {
        activeConnections = Object.keys(io.sockets.sockets).length;
      }
    } catch (error) {
      console.error('Error counting active socket connections:', error);
    }
    
    // Check Redis status
    let redisStatus = 'offline';
    let redisConfig = getRedisConfig();
    let redisDetails = null;
    
    try {
      // Create a Redis client specifically for this health check
      const redisClient = new Redis(redisConfig);
      
      // Ping Redis to check status
      const pingResult = await redisClient.ping();
      if (pingResult === 'PONG') {
        redisStatus = 'online';
        redisDetails = {
          host: redisConfig.host,
          port: redisConfig.port
        };
      } else {
        redisStatus = 'error';
      }
      
      // Disconnect this test client
      await redisClient.quit();
      
    } catch (error) {
      console.error('Error checking Redis health:', error);
      redisStatus = 'error';
    }
    
    // Put it all together
    const healthData = {
      status: 'online',
      version: 'v1.0.0 Beta',
      uptime,
      memory: {
        used: Math.round(usedMemory / (1024 * 1024)), // in MB
        total: Math.round(totalMemory / (1024 * 1024)) // in MB
      },
      activeConnections,
      responseTime: 0, // This will be calculated on the client side
      cpuLoad,
      lastChecked: new Date(),
      redis: {
        status: redisStatus,
        host: redisDetails?.host || '',
        port: redisDetails?.port || 0
      },
      rateLimiting: {
        status: 'enabled',
        provider: 'Redis',
        limits: {
          auth: '5 requests per minute',
          devices: '30 requests per minute',
          payloads: '20 requests per minute',
          deployments: '15 requests per minute',
          system: '10 requests per minute',
          users: '20 requests per minute',
          scripts: '25 requests per minute',
          global: '500 requests per 5 minutes'
        }
      }
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
}; 