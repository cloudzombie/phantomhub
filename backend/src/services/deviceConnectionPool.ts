/**
 * Device Connection Pool Service
 * 
 * Implements connection pooling for device communications to efficiently
 * manage connections to multiple devices simultaneously.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import logger from '../utils/logger';
import Device from '../models/Device';

// Type definition for a connection in the pool
interface PooledConnection {
  client: AxiosInstance;
  device: Device;
  lastUsed: number;
  inUse: boolean;
  createdAt: number;
}

// Connection pool configuration
interface PoolConfig {
  maxConnections: number;    // Maximum number of connections to maintain
  connectionTTL: number;     // Time to live for connections in milliseconds
  idleTimeout: number;       // Time after which idle connections are cleaned up
  acquireTimeout: number;    // Maximum time to wait for a connection
}

// Default connection pool configuration
const DEFAULT_POOL_CONFIG: PoolConfig = {
  maxConnections: 20,
  connectionTTL: 5 * 60 * 1000,  // 5 minutes
  idleTimeout: 60 * 1000,        // 1 minute
  acquireTimeout: 10 * 1000      // 10 seconds
};

// Default request configuration
const DEFAULT_REQUEST_CONFIG: AxiosRequestConfig = {
  timeout: 5000,  // 5 seconds
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'PhantomHub/1.0'
  }
};

/**
 * Device Connection Pool
 * Manages a pool of connections to devices for efficient communication
 */
class DeviceConnectionPool {
  private static instance: DeviceConnectionPool;
  private connections: Map<string, PooledConnection>; // Maps device ID to connection
  private waitingQueue: Map<string, Array<(connection: AxiosInstance | null) => void>>; // Maps device ID to callbacks
  private config: PoolConfig;
  private cleanupInterval: NodeJS.Timeout | null;

  private constructor(config: Partial<PoolConfig> = {}) {
    this.connections = new Map();
    this.waitingQueue = new Map();
    this.config = { ...DEFAULT_POOL_CONFIG, ...config };
    this.cleanupInterval = null;
    this.startCleanupInterval();
  }

  /**
   * Get the singleton instance of the connection pool
   */
  public static getInstance(config?: Partial<PoolConfig>): DeviceConnectionPool {
    if (!DeviceConnectionPool.instance) {
      DeviceConnectionPool.instance = new DeviceConnectionPool(config);
    }
    return DeviceConnectionPool.instance;
  }

  /**
   * Acquire a connection to a device
   * @param device The device to connect to
   * @returns A Promise that resolves to an AxiosInstance for the device or null if connection failed
   */
  public async acquireConnection(device: Device): Promise<AxiosInstance | null> {
    // Check if a connection already exists for this device
    const existingConnection = this.connections.get(device.id);
    
    if (existingConnection && !this.isConnectionExpired(existingConnection)) {
      // Check if the connection is in use
      if (existingConnection.inUse) {
        logger.debug(`Connection for device ${device.id} is in use, queuing request`);
        // Queue the request
        return new Promise((resolve) => {
          if (!this.waitingQueue.has(device.id)) {
            this.waitingQueue.set(device.id, []);
          }
          this.waitingQueue.get(device.id)?.push(resolve);
          
          // Set a timeout for the queued request
          setTimeout(() => {
            const queue = this.waitingQueue.get(device.id);
            if (queue && queue.includes(resolve)) {
              queue.splice(queue.indexOf(resolve), 1);
              resolve(null);
              logger.error(`Timed out waiting for connection to device ${device.id}`);
            }
          }, this.config.acquireTimeout);
        });
      }
      
      // Mark the connection as in use
      existingConnection.inUse = true;
      existingConnection.lastUsed = Date.now();
      
      logger.debug(`Reusing existing connection for device ${device.id}`);
      return existingConnection.client;
    }
    
    // No valid connection exists, create a new one
    try {
      // Check if we can create a new connection
      if (this.connections.size >= this.config.maxConnections) {
        logger.debug('Connection pool at maximum capacity, cleaning up idle connections');
        this.cleanupIdleConnections();
        
        // If we're still at capacity, queue the request
        if (this.connections.size >= this.config.maxConnections) {
          logger.debug(`Still at capacity after cleanup, queuing request for device ${device.id}`);
          return new Promise((resolve) => {
            if (!this.waitingQueue.has(device.id)) {
              this.waitingQueue.set(device.id, []);
            }
            this.waitingQueue.get(device.id)?.push(resolve);
            
            // Set a timeout for the queued request
            setTimeout(() => {
              const queue = this.waitingQueue.get(device.id);
              if (queue && queue.includes(resolve)) {
                queue.splice(queue.indexOf(resolve), 1);
                resolve(null);
                logger.error(`Timed out waiting for connection to device ${device.id}`);
              }
            }, this.config.acquireTimeout);
          });
        }
      }
      
      logger.debug(`Creating new connection for device ${device.id}`);
      
      // Create a new connection
      const client = axios.create({
        ...DEFAULT_REQUEST_CONFIG,
        baseURL: `http://${device.ipAddress}/api`
      });
      
      // Test the connection
      await client.get('/ping');
      
      // Store the connection in the pool
      const pooledConnection: PooledConnection = {
        client,
        device,
        lastUsed: Date.now(),
        inUse: true,
        createdAt: Date.now()
      };
      
      this.connections.set(device.id, pooledConnection);
      return client;
    } catch (error) {
      logger.error(`Failed to create connection for device ${device.id}:`, error);
      return null;
    }
  }

  /**
   * Release a connection back to the pool
   * @param deviceId The ID of the device whose connection is being released
   */
  public releaseConnection(deviceId: string): void {
    const connection = this.connections.get(deviceId);
    
    if (!connection) {
      logger.warn(`Attempted to release connection for unknown device ${deviceId}`);
      return;
    }
    
    connection.inUse = false;
    connection.lastUsed = Date.now();
    
    logger.debug(`Released connection for device ${deviceId}`);
    
    // Check if there are any waiting requests for this device
    const waitingCallbacks = this.waitingQueue.get(deviceId);
    
    if (waitingCallbacks && waitingCallbacks.length > 0) {
      logger.debug(`Processing queued request for device ${deviceId}`);
      
      // Get the next callback
      const nextCallback = waitingCallbacks.shift();
      
      if (nextCallback) {
        // Mark the connection as in use again
        connection.inUse = true;
        connection.lastUsed = Date.now();
        
        // Process the queued request
        nextCallback(connection.client);
      }
      
      // Clean up the queue if it's empty
      if (waitingCallbacks.length === 0) {
        this.waitingQueue.delete(deviceId);
      }
    }
  }

  /**
   * Close all connections in the pool
   */
  public async closeAllConnections(): Promise<void> {
    logger.info(`Closing all connections in the pool (${this.connections.size} connections)`);
    
    // Stop the cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Cancel all waiting requests
    for (const [deviceId, callbacks] of this.waitingQueue.entries()) {
      logger.debug(`Cancelling ${callbacks.length} queued requests for device ${deviceId}`);
      
      for (const callback of callbacks) {
        callback(null);
      }
    }
    
    this.waitingQueue.clear();
    this.connections.clear();
  }

  /**
   * Get statistics about the connection pool
   */
  public getPoolStats(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    queuedRequests: number;
  } {
    let activeConnections = 0;
    let queuedRequests = 0;
    
    // Count active connections
    for (const connection of this.connections.values()) {
      if (connection.inUse) {
        activeConnections++;
      }
    }
    
    // Count queued requests
    for (const callbacks of this.waitingQueue.values()) {
      queuedRequests += callbacks.length;
    }
    
    return {
      totalConnections: this.connections.size,
      activeConnections,
      idleConnections: this.connections.size - activeConnections,
      queuedRequests
    };
  }

  /**
   * Check if a connection has expired based on its TTL
   */
  private isConnectionExpired(connection: PooledConnection): boolean {
    const now = Date.now();
    return now - connection.createdAt > this.config.connectionTTL;
  }

  /**
   * Clean up idle connections in the pool
   */
  private cleanupIdleConnections(): void {
    const now = Date.now();
    let cleaned = 0;
    
    // Find connections that have been idle for too long
    for (const [deviceId, connection] of this.connections.entries()) {
      // Skip connections that are in use
      if (connection.inUse) {
        continue;
      }
      
      // Check if the connection has expired or been idle too long
      const isExpired = this.isConnectionExpired(connection);
      const isIdle = now - connection.lastUsed > this.config.idleTimeout;
      
      if (isExpired || isIdle) {
        logger.debug(`Cleaning up ${isExpired ? 'expired' : 'idle'} connection for device ${deviceId}`);
        this.connections.delete(deviceId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} idle/expired connections`);
    }
  }

  /**
   * Start the interval for cleaning up idle connections
   */
  private startCleanupInterval(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 60 * 1000);
    
    // Prevent the interval from keeping Node.js process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }
}

export default DeviceConnectionPool; 