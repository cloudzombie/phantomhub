/**
 * USB Utility Functions
 * 
 * Provides utilities for working with USB devices in the backend.
 * Since direct USB access from Node.js is limited, this primarily 
 * works with USB device identifiers and maintains connection state.
 */

import logger from './logger';

// Store USB device connection status
// This is populated when WebSerial connections are registered via the frontend
const connectedUSBDevices = new Map<string, { 
  lastSeen: Date; 
  deviceInfo: any;
}>();

/**
 * Register a USB device connection
 * Called when a device connects via WebSerial in the frontend
 * @param serialPortId Unique identifier for the USB device
 * @param deviceInfo Additional device information
 */
export function registerUSBDevice(serialPortId: string, deviceInfo: any = {}): void {
  connectedUSBDevices.set(serialPortId, {
    lastSeen: new Date(),
    deviceInfo
  });
  
  logger.info(`USB device registered: ${serialPortId}`);
}

/**
 * Update the last seen timestamp for a USB device
 * Called periodically to indicate the device is still connected
 * @param serialPortId Unique identifier for the USB device
 * @returns Boolean indicating if the update was successful
 */
export function updateUSBDeviceTimestamp(serialPortId: string): boolean {
  if (connectedUSBDevices.has(serialPortId)) {
    const deviceData = connectedUSBDevices.get(serialPortId);
    if (deviceData) {
      deviceData.lastSeen = new Date();
      connectedUSBDevices.set(serialPortId, deviceData);
    }
    return true;
  }
  
  return false;
}

/**
 * Unregister a USB device connection
 * Called when a device disconnects in the frontend
 * @param serialPortId Unique identifier for the USB device
 * @returns Boolean indicating if the unregistration was successful
 */
export function unregisterUSBDevice(serialPortId: string): boolean {
  if (connectedUSBDevices.has(serialPortId)) {
    connectedUSBDevices.delete(serialPortId);
    logger.info(`USB device unregistered: ${serialPortId}`);
    return true;
  }
  
  return false;
}

/**
 * Check if a USB device is currently connected
 * @param serialPortId Unique identifier for the USB device
 * @param maxAgeMs Maximum age in milliseconds to consider a device still connected (default: 5 minutes)
 * @returns Boolean indicating if the device is connected
 */
export async function checkUSBDeviceConnection(
  serialPortId: string, 
  maxAgeMs: number = 5 * 60 * 1000
): Promise<boolean> {
  if (!connectedUSBDevices.has(serialPortId)) {
    return false;
  }
  
  const deviceData = connectedUSBDevices.get(serialPortId);
  
  if (!deviceData) {
    return false;
  }
  
  // Check if the device has been seen recently
  const now = new Date();
  const ageMs = now.getTime() - deviceData.lastSeen.getTime();
  
  if (ageMs > maxAgeMs) {
    // Device hasn't been seen recently, consider it disconnected
    logger.warn(`USB device ${serialPortId} hasn't been seen for ${ageMs}ms, marking as disconnected`);
    connectedUSBDevices.delete(serialPortId);
    return false;
  }
  
  return true;
}

/**
 * Get all currently connected USB devices
 * @param maxAgeMs Maximum age in milliseconds to consider a device still connected
 * @returns Map of connected devices with their last seen timestamps
 */
export function getConnectedUSBDevices(maxAgeMs: number = 5 * 60 * 1000): Map<string, any> {
  const result = new Map<string, any>();
  const now = new Date();
  
  // Filter out devices that haven't been seen recently
  for (const [serialPortId, deviceData] of connectedUSBDevices.entries()) {
    const ageMs = now.getTime() - deviceData.lastSeen.getTime();
    
    if (ageMs <= maxAgeMs) {
      result.set(serialPortId, {
        ...deviceData,
        ageMs
      });
    } else {
      // Remove stale devices
      connectedUSBDevices.delete(serialPortId);
      logger.debug(`Removed stale USB device: ${serialPortId}`);
    }
  }
  
  return result;
}

/**
 * Clean up stale USB device connections
 * @param maxAgeMs Maximum age in milliseconds to consider a device still connected
 * @returns Number of devices that were cleaned up
 */
export function cleanupStaleUSBDevices(maxAgeMs: number = 5 * 60 * 1000): number {
  let cleanupCount = 0;
  const now = new Date();
  
  for (const [serialPortId, deviceData] of connectedUSBDevices.entries()) {
    const ageMs = now.getTime() - deviceData.lastSeen.getTime();
    
    if (ageMs > maxAgeMs) {
      connectedUSBDevices.delete(serialPortId);
      cleanupCount++;
      logger.debug(`Cleaned up stale USB device: ${serialPortId}`);
    }
  }
  
  if (cleanupCount > 0) {
    logger.info(`Cleaned up ${cleanupCount} stale USB device connections`);
  }
  
  return cleanupCount;
} 