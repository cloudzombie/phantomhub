/**
 * Device Status Service
 * 
 * Background service for polling and monitoring device status
 * Implements proper error recovery and database updates
 */

import Device from '../models/Device';
import { SocketService } from '../services/socketService';
import logger from '../utils/logger';
import { Op } from 'sequelize';

interface DeviceStatus {
  deviceId: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  lastSeen: string;
  batteryLevel?: number;
  signalStrength?: number;
  errors?: string[];
}

class DeviceStatusService {
  private static instance: DeviceStatusService;
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL = 30000; // 30 seconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds
  private socketService: SocketService;

  private constructor(socketService: SocketService) {
    this.socketService = socketService;
  }

  public static getInstance(socketService: SocketService): DeviceStatusService {
    if (!DeviceStatusService.instance) {
      DeviceStatusService.instance = new DeviceStatusService(socketService);
    }
    return DeviceStatusService.instance;
  }

  public async startPolling(): Promise<void> {
    if (this.pollingInterval) {
      logger.warn('Device status polling is already running');
      return;
    }

    logger.info('Starting device status polling service');
    this.pollingInterval = setInterval(() => this.pollDeviceStatus(), this.POLL_INTERVAL);
  }

  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      logger.info('Stopped device status polling service');
    }
  }

  private async pollDeviceStatus(): Promise<void> {
    try {
      // Get all active devices
      const devices = await Device.findAll({
        where: {
          status: {
            [Op.ne]: 'deleted'
          }
        }
      });

      for (const device of devices) {
        await this.checkDeviceStatus(device);
      }
    } catch (error) {
      logger.error('Error polling device status:', error);
      // Don't stop polling on error, just log it
    }
  }

  private async checkDeviceStatus(device: Device): Promise<void> {
    let retries = 0;
    let lastError: Error | null = null;

    while (retries < this.MAX_RETRIES) {
      try {
        const status = await this.getDeviceStatus(device);
        await this.updateDeviceStatus(device, status);
        return;
      } catch (error) {
        lastError = error as Error;
        retries++;
        if (retries < this.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * retries));
        }
      }
    }

    // If we get here, all retries failed
    logger.error(`Failed to check device status after ${this.MAX_RETRIES} retries:`, lastError);
    if (lastError) {
      await this.handleDeviceError(device, lastError);
    }
  }

  private async getDeviceStatus(device: Device): Promise<DeviceStatus> {
    // TODO: Implement actual device communication
    // This is a placeholder that simulates device status
    const isOnline = Math.random() > 0.1; // 90% chance of being online
    const hasError = Math.random() > 0.8; // 20% chance of error

    return {
      deviceId: device.id,
      status: hasError ? 'error' : isOnline ? 'online' : 'offline',
      lastSeen: new Date().toISOString(),
      batteryLevel: isOnline ? Math.floor(Math.random() * 100) : undefined,
      signalStrength: isOnline ? Math.floor(Math.random() * 100) : undefined,
      errors: hasError ? ['Simulated error for testing'] : undefined
    };
  }

  private async updateDeviceStatus(device: Device, status: DeviceStatus): Promise<void> {
    try {
      // Update device in database
      await device.update({
        status: status.status,
        lastSeen: new Date(status.lastSeen),
        batteryLevel: status.batteryLevel,
        signalStrength: status.signalStrength,
        errors: status.errors
      });

      // Emit status update to connected clients
      this.socketService.emitDeviceStatus(device.id, status);

      // Log status change
      logger.info(`Device ${device.id} status updated to ${status.status}`);
    } catch (error) {
      logger.error(`Error updating device ${device.id} status:`, error);
      throw error;
    }
  }

  private async handleDeviceError(device: Device, error: Error): Promise<void> {
    try {
      // Update device status to error
      await device.update({
        status: 'error',
        errors: [error.message]
      });

      // Emit error event to connected clients
      this.socketService.emitDeviceError(device.id, {
        message: error.message,
        details: error
      });

      logger.error(`Device ${device.id} error handled:`, error);
    } catch (updateError) {
      logger.error(`Error handling device ${device.id} error:`, updateError);
    }
  }
}

// Export a function to create the service instance
export const createDeviceStatusService = (socketService: SocketService): DeviceStatusService => {
  return DeviceStatusService.getInstance(socketService);
}; 