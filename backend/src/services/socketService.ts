/**
 * Socket Service
 * 
 * Handles real-time communication with clients using Socket.IO
 * Provides authenticated channels for device status updates
 */

import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  deviceId?: string;
}

export class SocketService {
  private io: Server;
  private deviceSubscriptions: Map<string, Set<string>> = new Map(); // deviceId -> userIds
  private userSubscriptions: Map<string, Set<string>> = new Map(); // userId -> deviceIds

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          throw new Error('Authentication token required');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
        socket.userId = decoded.userId;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`Client connected: ${socket.id} (User: ${socket.userId})`);

      // Subscribe to device updates
      socket.on('subscribe:device', (deviceId: string) => {
        if (!socket.userId) return;

        // Add to device subscriptions
        if (!this.deviceSubscriptions.has(deviceId)) {
          this.deviceSubscriptions.set(deviceId, new Set());
        }
        this.deviceSubscriptions.get(deviceId)?.add(socket.userId);

        // Add to user subscriptions
        if (!this.userSubscriptions.has(socket.userId)) {
          this.userSubscriptions.set(socket.userId, new Set());
        }
        this.userSubscriptions.get(socket.userId)?.add(deviceId);

        logger.debug(`User ${socket.userId} subscribed to device ${deviceId}`);
      });

      // Unsubscribe from device updates
      socket.on('unsubscribe:device', (deviceId: string) => {
        if (!socket.userId) return;

        this.deviceSubscriptions.get(deviceId)?.delete(socket.userId);
        this.userSubscriptions.get(socket.userId)?.delete(deviceId);

        logger.debug(`User ${socket.userId} unsubscribed from device ${deviceId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        if (!socket.userId) return;

        // Clean up user subscriptions
        const userDevices = this.userSubscriptions.get(socket.userId);
        if (userDevices) {
          userDevices.forEach(deviceId => {
            this.deviceSubscriptions.get(deviceId)?.delete(socket.userId!);
          });
          this.userSubscriptions.delete(socket.userId);
        }

        logger.info(`Client disconnected: ${socket.id} (User: ${socket.userId})`);
      });
    });
  }

  // Emit device status update to all subscribed users
  public emitDeviceStatus(deviceId: string, status: any) {
    const subscribers = this.deviceSubscriptions.get(deviceId);
    if (!subscribers) return;

    const event = `device:${deviceId}:status`;
    subscribers.forEach(userId => {
      this.io.to(userId).emit(event, status);
    });

    logger.debug(`Emitted status update for device ${deviceId} to ${subscribers.size} subscribers`);
  }

  // Emit device error to all subscribed users
  public emitDeviceError(deviceId: string, error: any) {
    const subscribers = this.deviceSubscriptions.get(deviceId);
    if (!subscribers) return;

    const event = `device:${deviceId}:error`;
    subscribers.forEach(userId => {
      this.io.to(userId).emit(event, error);
    });

    logger.debug(`Emitted error for device ${deviceId} to ${subscribers.size} subscribers`);
  }

  // Emit device activity log to all subscribed users
  public emitDeviceActivity(deviceId: string, activity: any) {
    const subscribers = this.deviceSubscriptions.get(deviceId);
    if (!subscribers) return;

    const event = `device:${deviceId}:activity`;
    subscribers.forEach(userId => {
      this.io.to(userId).emit(event, activity);
    });

    logger.debug(`Emitted activity for device ${deviceId} to ${subscribers.size} subscribers`);
  }

  // Get all subscribers for a device
  public getDeviceSubscribers(deviceId: string): string[] {
    return Array.from(this.deviceSubscriptions.get(deviceId) || []);
  }

  // Get all devices a user is subscribed to
  public getUserSubscriptions(userId: string): string[] {
    return Array.from(this.userSubscriptions.get(userId) || []);
  }

  // Emit event to all subscribers of a device
  public emitToDeviceSubscribers(deviceId: string, eventName: string, data: any) {
    const subscribers = this.deviceSubscriptions.get(deviceId);
    if (!subscribers) return;

    subscribers.forEach(userId => {
      this.io.to(userId).emit(eventName, data);
    });

    logger.debug(`Emitted ${eventName} for device ${deviceId} to ${subscribers.size} subscribers`);
  }
} 