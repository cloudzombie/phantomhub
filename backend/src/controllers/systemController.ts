import { Request, Response } from 'express';
import os from 'os';

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
}; 