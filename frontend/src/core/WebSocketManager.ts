import { io, Socket } from 'socket.io-client';
import { getToken } from '../utils/tokenManager';
import { SOCKET_ENDPOINT, WEBSOCKET_CONFIG } from '../config/api';

type EventCallback = (data: any) => void;

export class WebSocketManager {
  private static instance: WebSocketManager | null = null;
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectionAttempts: number = 0;
  private maxReconnectionAttempts: number = WEBSOCKET_CONFIG.reconnectionAttempts;
  private reconnectionDelay: number = WEBSOCKET_CONFIG.reconnectionDelay;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public connect(url: string = SOCKET_ENDPOINT): void {
    if (this.socket) {
      return;
    }

    this.connectionStatus = 'connecting';
    const token = getToken();

    this.socket = io(url, {
      auth: { token },
      reconnectionAttempts: this.maxReconnectionAttempts,
      reconnectionDelay: this.reconnectionDelay,
      autoConnect: true,
      transports: ['websocket']
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.connectionStatus = 'connected';
      this.reconnectionAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`WebSocket disconnected: ${reason}`);
      this.connectionStatus = 'disconnected';
      
      if (reason === 'io server disconnect') {
        // The server has forcefully disconnected the socket
        this.reconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectionAttempts++;
      
      if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
        console.error('Max reconnection attempts reached, giving up');
        this.disconnect();
      } else {
        setTimeout(() => this.reconnect(), this.reconnectionDelay * this.reconnectionAttempts);
      }
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

    // Add custom event handlers here
    this.socket.onAny((eventName, ...args) => {
      this.notifyListeners(eventName, ...args);
    });
  }

  private notifyListeners(eventName: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(args.length === 1 ? args[0] : args);
        } catch (error) {
          console.error(`Error in event listener for "${eventName}":`, error);
        }
      });
    }
  }

  public subscribe(eventName: string, callback: EventCallback): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)?.add(callback);

    // If this is a device subscription event, notify the backend
    if (eventName.startsWith('device:') && eventName.endsWith(':status')) {
      const deviceId = eventName.split(':')[1];
      this.socket?.emit('subscribe:device', deviceId);
    }
  }

  public unsubscribe(eventName: string, callback: EventCallback): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventName);
      }
    }

    // If this is a device subscription event, notify the backend
    if (eventName.startsWith('device:') && eventName.endsWith(':status')) {
      const deviceId = eventName.split(':')[1];
      this.socket?.emit('unsubscribe:device', deviceId);
    }
  }

  public emit(eventName: string, data?: any): void {
    if (this.socket && this.connectionStatus === 'connected') {
      this.socket.emit(eventName, data);
    } else {
      console.warn(`Cannot emit event "${eventName}": Socket is not connected`);
    }
  }

  public reconnect(): void {
    if (this.socket) {
      this.socket.connect();
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatus = 'disconnected';
    }
  }

  public getConnectionStatus(): string {
    return this.connectionStatus;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public clearAllListeners(): void {
    this.listeners.clear();
    if (this.socket) {
      this.socket.offAny();
    }
  }
} 