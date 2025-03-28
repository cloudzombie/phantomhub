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
  private readonly POLL_INTERVAL = 300000; // 5 minutes
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds
  private socketService: SocketService;
  private deviceStates: Map<string, DeviceStatus> = new Map();
  private lastPollTime: Map<string, number> = new Map();
  private isPolling: boolean = false;

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
    await this.pollDeviceStatus(); // Initial poll
    this.pollingInterval = setInterval(() => this.pollDeviceStatus(), this.POLL_INTERVAL);
  }

  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.isPolling = false;
      logger.info('Stopped device status polling service');
    }
  }

  private async pollDeviceStatus(): Promise<void> {
    if (this.isPolling) {
      logger.debug('Skipping poll - previous poll still in progress');
      return;
    }

    this.isPolling = true;

    try {
      // Get all active devices
      const devices = await Device.findAll({
        where: {
          status: {
            [Op.ne]: 'deleted'
          }
        }
      });

      const now = Date.now();
      for (const device of devices) {
        const lastPoll = this.lastPollTime.get(device.id) || 0;
        // Only poll if it's been at least POLL_INTERVAL since last poll
        if (now - lastPoll >= this.POLL_INTERVAL) {
          await this.checkDeviceStatus(device);
          this.lastPollTime.set(device.id, now);
        }
      }
    } catch (error) {
      logger.error('Error polling device status:', error);
    } finally {
      this.isPolling = false;
    }
  }

  private async checkDeviceStatus(device: Device): Promise<void> {
    let retries = 0;
    let lastError: Error | null = null;

    // Get current state
    const currentState = this.deviceStates.get(device.id);

    while (retries < this.MAX_RETRIES) {
      try {
        const status = await this.getDeviceStatus(device);
        
        // Only update if state has changed
        if (!currentState || 
            currentState.status !== status.status || 
            currentState.batteryLevel !== status.batteryLevel ||
            currentState.signalStrength !== status.signalStrength) {
          await this.updateDeviceStatus(device, status);
          this.deviceStates.set(device.id, status);
        }
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
    // Get current state
    const currentState = this.deviceStates.get(device.id);
    
    // If we have a current state and it's recent, use it
    if (currentState && 
        Date.now() - new Date(currentState.lastSeen).getTime() < this.POLL_INTERVAL) {
      return currentState;
    }

    // TODO: Implement actual device communication
    // This is a placeholder that simulates device status
    const isOnline = Math.random() > 0.1; // 90% chance of being online
    const hasError = Math.random() > 0.8; // 20% chance of error

    const status: DeviceStatus = {
      deviceId: device.id,
      status: hasError ? 'error' : isOnline ? 'online' : 'offline',
      lastSeen: new Date().toISOString(),
      batteryLevel: isOnline ? Math.floor(Math.random() * 100) : undefined,
      signalStrength: isOnline ? Math.floor(Math.random() * 100) : undefined,
      errors: hasError ? ['Simulated error for testing'] : undefined
    };

    return status;
  }

  private async updateDeviceStatus(device: Device, status: DeviceStatus): Promise<void> {
    try {
      // Only update if status has changed
      if (device.status !== status.status) {
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
      }
    } catch (error) {
      logger.error(`Error updating device ${device.id} status:`, error);
      throw error;
    }
  }

  private async handleDeviceError(device: Device, error: Error): Promise<void> {
    try {
      const currentState = this.deviceStates.get(device.id);
      
      // Only update if not already in error state
      if (!currentState || currentState.status !== 'error') {
        // Update device status to error
        await device.update({
          status: 'error',
          errors: [error.message]
        });

        // Update state
        const errorState: DeviceStatus = {
          deviceId: device.id,
          status: 'error',
          lastSeen: new Date().toISOString(),
          errors: [error.message]
        };
        this.deviceStates.set(device.id, errorState);

        // Emit error event to connected clients
        this.socketService.emitDeviceError(device.id, {
          message: error.message,
          details: error
        });

        logger.error(`Device ${device.id} error handled:`, error);
      }
    } catch (updateError) {
      logger.error(`Error handling device ${device.id} error:`, updateError);
    }
  }

  // Method to manually trigger a status check for a device
  public async checkDeviceStatusNow(deviceId: string): Promise<void> {
    const device = await Device.findByPk(deviceId);
    if (device) {
      await this.checkDeviceStatus(device);
    }
  }

  // Method to clear device state
  public clearDeviceState(deviceId: string): void {
    this.deviceStates.delete(deviceId);
    this.lastPollTime.delete(deviceId);
  }
}

// Export a function to create the service instance
export const createDeviceStatusService = (socketService: SocketService): DeviceStatusService => {
  return DeviceStatusService.getInstance(socketService);
}; 