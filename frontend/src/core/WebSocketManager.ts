import { io, Socket } from 'socket.io-client';
import { getToken } from '../utils/tokenManager';
import { API_CONFIG } from '../config/api';

export class WebSocketManager {
  private static instance: WebSocketManager | null = null;
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = API_CONFIG.maxReconnectAttempts;
  private readonly RECONNECT_DELAY = API_CONFIG.reconnectDelay;

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public connect(): void {
    if (this.socket?.connected) return;

    const token = getToken();
    if (!token) {
      console.error('No authentication token available');
      return;
    }

    this.socket = io(API_CONFIG.socketEndpoint, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: this.RECONNECT_DELAY,
      timeout: 20000,
      withCredentials: true
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Handle device status updates
    this.socket.on('device:*:status', (data) => {
      const deviceId = data.deviceId;
      this.emit('device_status_update', { deviceId, status: data });
    });

    // Handle device errors
    this.socket.on('device:*:error', (data) => {
      const deviceId = data.deviceId;
      this.emit('device_error', { deviceId, error: data });
    });

    // Handle device activity
    this.socket.on('device:*:activity', (data) => {
      const deviceId = data.deviceId;
      this.emit('device_activity', { deviceId, activity: data });
    });
  }

  public subscribe(event: string, callback: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)?.add(callback);

    // If this is a device subscription event, notify the backend
    if (event.startsWith('device:') && event.endsWith(':status')) {
      const deviceId = event.split(':')[1];
      this.socket?.emit('subscribe:device', deviceId);
    }
  }

  public unsubscribe(event: string, callback: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(callback);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }

    // If this is a device subscription event, notify the backend
    if (event.startsWith('device:') && event.endsWith(':status')) {
      const deviceId = event.split(':')[1];
      this.socket?.emit('unsubscribe:device', deviceId);
    }
  }

  public emit(event: string, data: any): void {
    this.socket?.emit(event, data);
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.eventHandlers.clear();
    }
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public reconnectSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.reconnectAttempts = 0;
    this.connect();
  }
} 