import { Request, Response } from 'express';
import { sequelize } from '../../config/database';
import { Op } from 'sequelize';
import User from '../../models/User';
import Device from '../../models/Device';
import Payload from '../../models/Payload';
import Deployment from '../../models/Deployment';
import Script from '../../models/Script';
import logger from '../../utils/logger';
import os from 'os';
import fs from 'fs';
import path from 'path';

// Interface for the authenticated request with user info
interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

/**
 * Get system statistics (users, devices, payloads, etc.)
 */
export const getSystemStats = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get counts from database
    const userCount = await User.count();
    const deviceCount = await Device.count();
    const payloadCount = await Payload.count();
    const deploymentCount = await Deployment.count();
    const scriptCount = await Script.count();
    
    // Get active devices count
    const activeDeviceCount = await Device.count({
      where: { status: 'online' }
    });
    
    // Get recent deployments (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentDeploymentCount = await Deployment.count({
      where: {
        createdAt: {
          [Op.gte]: oneWeekAgo
        }
      }
    });
    
    // Get user role distribution
    const userRoleDistribution = await User.findAll({
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['role']
    });
    
    // Get deployment success rate
    const successfulDeployments = await Deployment.count({
      where: { status: 'completed' }
    });
    
    const failedDeployments = await Deployment.count({
      where: { status: 'failed' }
    });
    
    const successRate = deploymentCount > 0 
      ? (successfulDeployments / deploymentCount) * 100 
      : 0;
    
    // Get system information
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / (1024 * 1024)), // MB
      freeMemory: Math.round(os.freemem() / (1024 * 1024)), // MB
      uptime: Math.floor(os.uptime() / 3600), // hours
      nodeVersion: process.version,
      hostname: os.hostname()
    };
    
    // Log action
    const adminUser = (req as AuthRequest).user;
    logger.info(`Admin ${adminUser?.name} (${adminUser?.id}) viewed system statistics`);
    
    return res.status(200).json({
      success: true,
      data: {
        users: {
          total: userCount,
          roleDistribution: userRoleDistribution
        },
        devices: {
          total: deviceCount,
          active: activeDeviceCount,
          inactive: deviceCount - activeDeviceCount
        },
        payloads: {
          total: payloadCount
        },
        deployments: {
          total: deploymentCount,
          recent: recentDeploymentCount,
          successful: successfulDeployments,
          failed: failedDeployments,
          successRate: successRate.toFixed(2) + '%'
        },
        scripts: {
          total: scriptCount
        },
        system: systemInfo
      }
    });
  } catch (error) {
    logger.error('Error getting system statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve system statistics'
    });
  }
};

/**
 * Get application logs
 */
export const getApplicationLogs = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Parse query parameters
    const limit = parseInt(req.query.limit as string) || 100;
    const level = req.query.level as string || 'all';
    
    // Define log file path (adjust based on your logger configuration)
    const logFilePath = process.env.LOG_FILE_PATH || path.join(__dirname, '../../../logs/app.log');
    
    // Check if log file exists
    if (!fs.existsSync(logFilePath)) {
      return res.status(404).json({
        success: false,
        message: 'Log file not found'
      });
    }
    
    // Read log file
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    
    // Split into lines and take the most recent ones
    const logLines = logContent.split('\n').filter(line => line.trim() !== '');
    const recentLogs = logLines.slice(-limit);
    
    // Parse log lines into structured format
    const parsedLogs = recentLogs.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        // If line isn't valid JSON, return it as raw text
        return { level: 'unknown', message: line, timestamp: new Date().toISOString() };
      }
    });
    
    // Filter by level if specified
    const filteredLogs = level === 'all' 
      ? parsedLogs 
      : parsedLogs.filter(log => log.level === level);
    
    // Log action
    const adminUser = (req as AuthRequest).user;
    logger.info(`Admin ${adminUser?.name} (${adminUser?.id}) viewed application logs`);
    
    return res.status(200).json({
      success: true,
      data: filteredLogs
    });
  } catch (error) {
    logger.error('Error retrieving application logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve application logs'
    });
  }
};

/**
 * Get system health status
 */
export const getSystemHealth = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Check database connection
    let dbStatus = 'offline';
    let dbResponseTime = 0;
    
    try {
      const dbStartTime = Date.now();
      await sequelize.authenticate();
      dbResponseTime = Date.now() - dbStartTime;
      dbStatus = 'online';
    } catch (error) {
      logger.error('Database connection error:', error);
      dbStatus = 'error';
    }
    
    // Get memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // Get CPU usage
    const cpuUsage = process.cpuUsage();
    const totalCPUUsage = cpuUsage.user + cpuUsage.system;
    // Convert from microseconds to percentage with a reasonable scaling factor
    const cpuLoad = Math.min(Math.round((totalCPUUsage / 1000000) * 5), 100);
    
    // Get disk usage (simplified)
    let diskSpace = { total: 0, free: 0, used: 0 };
    
    try {
      // This is a simplified approach - in production you might want to use a library
      const stats = fs.statfsSync('/');
      diskSpace = {
        total: stats.blocks * stats.bsize,
        free: stats.bfree * stats.bsize,
        used: (stats.blocks - stats.bfree) * stats.bsize
      };
    } catch (error) {
      logger.error('Error getting disk space:', error);
    }
    
    // System information
    const systemInfo = {
      status: dbStatus === 'online' ? 'online' : 'degraded',
      version: process.env.APP_VERSION || 'v1.0.0',
      uptime: Math.floor(process.uptime()),
      hostname: os.hostname(),
      platform: os.platform(),
      cpuInfo: os.cpus()[0]?.model || 'Unknown CPU',
      loadAvg: os.loadavg().map(load => load.toFixed(2)),
      memory: {
        used: Math.round(usedMemory / (1024 * 1024)), // in MB
        total: Math.round(totalMemory / (1024 * 1024)), // in MB
        percentage: Math.round((usedMemory / totalMemory) * 100)
      },
      disk: {
        used: Math.round(diskSpace.used / (1024 * 1024 * 1024)), // in GB
        total: Math.round(diskSpace.total / (1024 * 1024 * 1024)), // in GB
        percentage: Math.round((diskSpace.used / diskSpace.total) * 100)
      },
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
        dialect: sequelize.getDialect(),
        host: sequelize.config.host
      },
      processes: {
        pid: process.pid,
        memoryUsage: Math.round(process.memoryUsage().rss / (1024 * 1024)) // in MB
      },
      lastChecked: new Date()
    };
    
    // Log action
    const adminUser = (req as AuthRequest).user;
    logger.info(`Admin ${adminUser?.name} (${adminUser?.id}) checked system health`);
    
    return res.status(200).json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    logger.error('Error getting system health:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve system health information'
    });
  }
};

/**
 * Toggle maintenance mode
 */
export const toggleMaintenanceMode = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { enabled, message } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Enabled flag must be a boolean'
      });
    }
    
    // In a real implementation, you would store this in a database or environment variable
    // For this example, we'll use a global variable (not ideal for production)
    // Define a type for the global variable
    if (!global.hasOwnProperty('maintenanceMode')) {
      (global as any).maintenanceMode = {};
    }
    
    (global as any).maintenanceMode = {
      enabled,
      message: message || 'System is under maintenance. Please try again later.',
      startedAt: enabled ? new Date() : null
    };
    
    // Log action
    const adminUser = (req as AuthRequest).user;
    logger.warn(`Admin ${adminUser?.name} (${adminUser?.id}) ${enabled ? 'enabled' : 'disabled'} maintenance mode`);
    
    return res.status(200).json({
      success: true,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
      data: (global as any).maintenanceMode
    });
  } catch (error) {
    logger.error('Error toggling maintenance mode:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle maintenance mode'
    });
  }
};
